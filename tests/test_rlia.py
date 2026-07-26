"""Sanity + gradient-correctness tests. Run with: python -m unittest discover tests -v"""

from __future__ import annotations

import math
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rlia.algos import (
    GRPO,
    REINFORCE,
    default_task_sampler,
    evaluate,
    mixed_difficulty_sampler,
    rollout,
)
from rlia.env import InstructionGridWorld, feature_dim, features, sample_task
from rlia.policy import (
    Adam,
    LinearSoftmaxPolicy,
    accumulate_kl_grad,
    accumulate_logp_grad,
    kl,
    make_optimizer,
    zeros,
)


class TestEnv(unittest.TestCase):
    def test_task_is_unambiguous(self):
        rng = random.Random(0)
        for _ in range(200):
            task = sample_task(rng)
            matching = [o for o in task.objects if task.instruction.matches(o)]
            self.assertEqual(len(matching), 1)
            self.assertEqual(matching[0], task.target)
            positions = [o.pos for o in task.objects]
            self.assertEqual(len(set(positions)), len(positions))
            self.assertNotIn(task.agent_start, positions)

    def test_objects_are_in_canonical_order(self):
        rng = random.Random(7)
        for _ in range(50):
            task = sample_task(rng)
            keys = [o.sort_key for o in task.objects]
            self.assertEqual(keys, sorted(keys))

    def test_reaching_target_pays_one(self):
        rng = random.Random(1)
        env = InstructionGridWorld(max_steps=50, step_cost=0.0)
        task = sample_task(rng)
        env.reset(task)
        # walk to the target by hand: x first, then y
        tx, ty = task.target.pos
        reward = 0.0
        done = False
        while not done:
            ax, ay = env.agent_pos
            if ax != tx:
                action = 3 if tx > ax else 2
            else:
                action = 1 if ty > ay else 0
            _, r, done, info = env.step(action)
            reward += r
        self.assertEqual(info["outcome"], "success")
        self.assertAlmostEqual(reward, 1.0)

    def test_walls_clamp_and_timeout_terminates(self):
        rng = random.Random(3)
        env = InstructionGridWorld(max_steps=4, step_cost=0.01)
        task = sample_task(rng, size=5, n_objects=1)
        env.reset(task)
        for _ in range(3):
            env.step(0)  # up, into the top wall
            env.step(2)  # left, into the left wall
            if env.done:
                break
        self.assertTrue(env.done)
        self.assertTrue(0 <= env.agent_pos[0] < 5 and 0 <= env.agent_pos[1] < 5)

    def test_step_before_reset_raises(self):
        with self.assertRaises(RuntimeError):
            InstructionGridWorld().step(0)

    def test_feature_dim_matches_features(self):
        rng = random.Random(5)
        for n in (1, 3, 6):
            task = sample_task(rng, n_objects=n)
            self.assertEqual(len(features(task, (0, 0))), feature_dim(n))


class TestPolicy(unittest.TestCase):
    def setUp(self):
        self.rng = random.Random(11)
        self.policy = LinearSoftmaxPolicy(6, 4)
        for row in self.policy.W:
            for d in range(len(row)):
                row[d] = self.rng.uniform(-1.0, 1.0)
        self.phi = [self.rng.uniform(-1.0, 1.0) for _ in range(6)]

    def test_probs_normalise(self):
        probs = self.policy.probs(self.phi)
        self.assertAlmostEqual(sum(probs), 1.0)
        self.assertTrue(all(p > 0.0 for p in probs))

    def test_sample_respects_distribution(self):
        counts = [0] * 4
        rng = random.Random(2)
        for _ in range(20000):
            counts[self.policy.sample(self.phi, rng)] += 1
        probs = self.policy.probs(self.phi)
        for empirical, expected in zip((c / 20000 for c in counts), probs):
            self.assertAlmostEqual(empirical, expected, delta=0.02)

    def test_logp_gradient_matches_finite_differences(self):
        action = 2
        grad = zeros(4, 6)
        accumulate_logp_grad(grad, self.phi, self.policy.probs(self.phi), action, 1.0)

        eps = 1e-6
        for a in range(4):
            for d in range(6):
                original = self.policy.W[a][d]
                self.policy.W[a][d] = original + eps
                up = math.log(self.policy.probs(self.phi)[action])
                self.policy.W[a][d] = original - eps
                down = math.log(self.policy.probs(self.phi)[action])
                self.policy.W[a][d] = original
                self.assertAlmostEqual(grad[a][d], (up - down) / (2 * eps), places=6)

    def test_kl_gradient_matches_finite_differences(self):
        reference = LinearSoftmaxPolicy(6, 4)
        for a, row in enumerate(reference.W):
            for d in range(6):
                row[d] = self.rng.uniform(-1.0, 1.0)
        ref_probs = reference.probs(self.phi)

        grad = zeros(4, 6)
        accumulate_kl_grad(grad, self.phi, self.policy.probs(self.phi), ref_probs, 1.0)

        eps = 1e-6
        for a in range(4):
            for d in range(6):
                original = self.policy.W[a][d]
                self.policy.W[a][d] = original + eps
                up = kl(self.policy.probs(self.phi), ref_probs)
                self.policy.W[a][d] = original - eps
                down = kl(self.policy.probs(self.phi), ref_probs)
                self.policy.W[a][d] = original
                self.assertAlmostEqual(grad[a][d], (up - down) / (2 * eps), places=6)

    def test_kl_is_zero_against_self_and_positive_otherwise(self):
        probs = self.policy.probs(self.phi)
        self.assertAlmostEqual(kl(probs, probs), 0.0)
        other = LinearSoftmaxPolicy(6, 4)
        self.assertGreater(kl(probs, other.probs(self.phi)), 0.0)


class TestOptimizers(unittest.TestCase):
    def test_make_optimizer_rejects_unknown_names(self):
        policy = LinearSoftmaxPolicy(3, 2)
        with self.assertRaises(ValueError):
            make_optimizer("rmsprop", policy)

    def test_sgd_step_is_lr_times_gradient(self):
        policy = LinearSoftmaxPolicy(2, 2)
        make_optimizer("sgd", policy).step(policy, [[1.0, -2.0], [0.5, 0.0]], 0.1)
        self.assertEqual(policy.W, [[0.1, -0.2], [0.05, 0.0]])

    def test_adam_first_step_is_lr_times_sign(self):
        policy = LinearSoftmaxPolicy(2, 2)
        Adam(2, 2).step(policy, [[3.0, -0.001], [0.0, 7.0]], 0.1)
        # bias-corrected first moment / sqrt(second) == sign(g), up to eps
        self.assertAlmostEqual(policy.W[0][0], 0.1, places=5)
        self.assertAlmostEqual(policy.W[0][1], -0.1, places=5)
        self.assertAlmostEqual(policy.W[1][0], 0.0, places=9)
        self.assertAlmostEqual(policy.W[1][1], 0.1, places=5)


class TestTraining(unittest.TestCase):
    """Both learners must beat the untrained policy by a wide margin."""

    def _train(self, trainer_cls, iters, sampler=None, seed=0, **kwargs):
        rng = random.Random(seed)
        env = InstructionGridWorld(max_steps=20)
        sampler = sampler or default_task_sampler()
        policy = LinearSoftmaxPolicy(feature_dim(3), env.n_actions)
        before = evaluate(policy, env, sampler, n_tasks=200)
        trainer = trainer_cls(policy, env, sampler, **kwargs)
        for _ in range(iters):
            trainer.iterate(rng)
        after = evaluate(policy, env, sampler, n_tasks=200)
        return before, after

    def test_grpo_learns(self):
        before, after = self._train(GRPO, iters=400, group_size=8, prompts_per_batch=8)
        self.assertGreater(after.success_rate, 0.7)
        self.assertGreater(after.success_rate, before.success_rate + 0.5)

    def test_reinforce_learns(self):
        before, after = self._train(REINFORCE, iters=400, batch_size=64)
        self.assertGreater(after.success_rate, 0.7)
        self.assertGreater(after.success_rate, before.success_rate + 0.5)

    def test_grpo_learns_under_mixed_difficulty(self):
        before, after = self._train(
            GRPO,
            iters=400,
            sampler=mixed_difficulty_sampler(),
            group_size=8,
            prompts_per_batch=8,
        )
        self.assertGreater(after.success_rate, 0.6)
        self.assertGreater(after.success_rate, before.success_rate + 0.4)

    def test_training_is_deterministic_under_a_seed(self):
        runs = []
        for _ in range(2):
            rng = random.Random(42)
            env = InstructionGridWorld()
            sampler = default_task_sampler()
            policy = LinearSoftmaxPolicy(feature_dim(3), env.n_actions)
            trainer = GRPO(policy, env, sampler, group_size=4, prompts_per_batch=4)
            for _ in range(10):
                trainer.iterate(rng)
            runs.append([round(w, 10) for row in policy.W for w in row])
        self.assertEqual(runs[0], runs[1])

    def test_greedy_rollout_is_reproducible(self):
        rng = random.Random(4)
        env = InstructionGridWorld()
        task = sample_task(rng)
        policy = LinearSoftmaxPolicy(feature_dim(3), env.n_actions)
        a = rollout(env, policy, task, random.Random(1), greedy=True)
        b = rollout(env, policy, task, random.Random(2), greedy=True)
        self.assertEqual([s.action for s in a.steps], [s.action for s in b.steps])


if __name__ == "__main__":
    unittest.main()
