"""REINFORCE and GRPO over the instruction-conditioned gridworld.

Both algorithms optimise the same objective -- expected verifiable reward,
anchored to a reference policy by a KL penalty. They differ only in where the
baseline comes from:

  * REINFORCE  subtracts a running average of past returns (a *global* baseline
               shared across every prompt, so easy prompts and hard prompts are
               compared against the same number).
  * GRPO       rolls the *same* prompt out G times and normalises within that
               group, so the baseline is per-prompt and no value network is
               needed. This is the recipe behind current instruction-tuned RL.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from statistics import fmean, pstdev
from typing import Callable, List, Optional, Sequence

from .env import InstructionGridWorld, Task, sample_task
from .policy import (
    LinearSoftmaxPolicy,
    Matrix,
    accumulate_kl_grad,
    accumulate_logp_grad,
    clip_,
    make_optimizer,
    zeros,
)

TaskSampler = Callable[[random.Random], Task]


@dataclass
class Step:
    phi: List[float]
    probs: List[float]
    ref_probs: List[float]
    action: int
    reward: float


@dataclass
class Rollout:
    steps: List[Step] = field(default_factory=list)
    outcome: str = "running"

    @property
    def total_reward(self) -> float:
        return sum(s.reward for s in self.steps)

    @property
    def length(self) -> int:
        return len(self.steps)


def rollout(
    env: InstructionGridWorld,
    policy: LinearSoftmaxPolicy,
    task: Task,
    rng: random.Random,
    reference: Optional[LinearSoftmaxPolicy] = None,
    greedy: bool = False,
) -> Rollout:
    phi = env.reset(task)
    traj = Rollout()
    done = False
    while not done:
        probs = policy.probs(phi)
        ref_probs = reference.probs(phi) if reference is not None else probs
        action = policy.greedy(phi) if greedy else policy.sample(phi, rng)
        next_phi, reward, done, info = env.step(action)
        traj.steps.append(Step(list(phi), probs, list(ref_probs), action, reward))
        traj.outcome = info["outcome"]
        phi = next_phi
    return traj


def _accumulate_trajectory(
    grad: Matrix,
    traj: Rollout,
    advantage: float,
    kl_coef: float,
    length_normalize: bool = True,
) -> None:
    """Add one trajectory's contribution to the ascent direction.

    `length_normalize` divides by |tau|, as the GRPO objective does. Without it a
    20-step timeout contributes five times the gradient of a 4-step success
    purely because it is longer, and the update is dominated by failure.
    """
    scale = 1.0 / max(traj.length, 1) if length_normalize else 1.0
    for step in traj.steps:
        if advantage != 0.0:
            accumulate_logp_grad(
                grad, step.phi, step.probs, step.action, advantage * scale
            )
        if kl_coef > 0.0:
            # KL is *subtracted* from the objective, hence the negative weight
            # on an ascent step.
            accumulate_kl_grad(
                grad, step.phi, step.probs, step.ref_probs, -kl_coef * scale
            )


@dataclass
class IterationStats:
    mean_reward: float
    success_rate: float
    grad_norm: float
    n_trajectories: int


class GRPO:
    """Group Relative Policy Optimisation (single inner epoch, no clipping).

    Each prompt is rolled out `group_size` times; the advantage of a rollout is
    its return standardised within its own group. With one gradient step per
    batch of fresh rollouts the importance ratio is identically 1, so the PPO
    clipping term is a no-op and is left out rather than faked.
    """

    def __init__(
        self,
        policy: LinearSoftmaxPolicy,
        env: InstructionGridWorld,
        task_sampler: TaskSampler,
        group_size: int = 8,
        prompts_per_batch: int = 8,
        lr: float = 0.05,
        kl_coef: float = 0.02,
        length_normalize: bool = True,
        max_grad_norm: float = 5.0,
        optimizer: str = "adam",
        reference: Optional[LinearSoftmaxPolicy] = None,
    ) -> None:
        self.policy = policy
        self.env = env
        self.task_sampler = task_sampler
        self.group_size = group_size
        self.prompts_per_batch = prompts_per_batch
        self.lr = lr
        self.kl_coef = kl_coef
        self.length_normalize = length_normalize
        self.max_grad_norm = max_grad_norm
        self.optimizer = make_optimizer(optimizer, policy)
        self.reference = reference if reference is not None else policy.clone()

    def iterate(self, rng: random.Random) -> IterationStats:
        grad = zeros(self.policy.n_actions, self.policy.n_features)
        rewards: List[float] = []
        successes = 0
        n_traj = 0

        for _ in range(self.prompts_per_batch):
            task = self.task_sampler(rng)
            group = [
                rollout(self.env, self.policy, task, rng, self.reference)
                for _ in range(self.group_size)
            ]
            returns = [t.total_reward for t in group]
            baseline = fmean(returns)
            spread = pstdev(returns)
            for traj, ret in zip(group, returns):
                advantage = (ret - baseline) / (spread + 1e-6)
                _accumulate_trajectory(
                    grad, traj, advantage, self.kl_coef, self.length_normalize
                )
                rewards.append(ret)
                successes += traj.outcome == "success"
                n_traj += 1

        for row in grad:
            for d in range(len(row)):
                row[d] /= n_traj

        norm = clip_(grad, self.max_grad_norm)
        self.optimizer.step(self.policy, grad, self.lr)
        return IterationStats(fmean(rewards), successes / n_traj, norm, n_traj)


class REINFORCE:
    """Vanilla policy gradient with a running-average baseline."""

    def __init__(
        self,
        policy: LinearSoftmaxPolicy,
        env: InstructionGridWorld,
        task_sampler: TaskSampler,
        batch_size: int = 64,
        lr: float = 0.05,
        kl_coef: float = 0.02,
        length_normalize: bool = True,
        baseline_decay: float = 0.9,
        max_grad_norm: float = 5.0,
        optimizer: str = "adam",
        reference: Optional[LinearSoftmaxPolicy] = None,
    ) -> None:
        self.policy = policy
        self.env = env
        self.task_sampler = task_sampler
        self.batch_size = batch_size
        self.lr = lr
        self.kl_coef = kl_coef
        self.length_normalize = length_normalize
        self.baseline_decay = baseline_decay
        self.max_grad_norm = max_grad_norm
        self.optimizer = make_optimizer(optimizer, policy)
        self.reference = reference if reference is not None else policy.clone()
        self.baseline = 0.0

    def iterate(self, rng: random.Random) -> IterationStats:
        grad = zeros(self.policy.n_actions, self.policy.n_features)
        rewards: List[float] = []
        successes = 0

        for _ in range(self.batch_size):
            task = self.task_sampler(rng)
            traj = rollout(self.env, self.policy, task, rng, self.reference)
            ret = traj.total_reward
            _accumulate_trajectory(
                grad, traj, ret - self.baseline, self.kl_coef, self.length_normalize
            )
            rewards.append(ret)
            successes += traj.outcome == "success"

        for row in grad:
            for d in range(len(row)):
                row[d] /= self.batch_size

        mean_reward = fmean(rewards)
        self.baseline = (
            self.baseline_decay * self.baseline + (1 - self.baseline_decay) * mean_reward
        )
        norm = clip_(grad, self.max_grad_norm)
        self.optimizer.step(self.policy, grad, self.lr)
        return IterationStats(mean_reward, successes / self.batch_size, norm, self.batch_size)


@dataclass
class EvalResult:
    success_rate: float
    wrong_object_rate: float
    timeout_rate: float
    mean_reward: float
    mean_steps_on_success: float

    def __str__(self) -> str:
        return (
            f"success {self.success_rate:6.1%} | wrong {self.wrong_object_rate:6.1%} | "
            f"timeout {self.timeout_rate:6.1%} | reward {self.mean_reward:+.3f} | "
            f"steps {self.mean_steps_on_success:.1f}"
        )


def evaluate(
    policy: LinearSoftmaxPolicy,
    env: InstructionGridWorld,
    task_sampler: TaskSampler,
    n_tasks: int = 500,
    seed: int = 12345,
    greedy: bool = True,
) -> EvalResult:
    rng = random.Random(seed)
    outcomes: List[str] = []
    rewards: List[float] = []
    success_steps: List[int] = []
    for _ in range(n_tasks):
        traj = rollout(env, policy, task_sampler(rng), rng, greedy=greedy)
        outcomes.append(traj.outcome)
        rewards.append(traj.total_reward)
        if traj.outcome == "success":
            success_steps.append(traj.length)
    n = float(n_tasks)
    return EvalResult(
        success_rate=outcomes.count("success") / n,
        wrong_object_rate=outcomes.count("wrong_object") / n,
        timeout_rate=outcomes.count("timeout") / n,
        mean_reward=fmean(rewards),
        mean_steps_on_success=fmean(success_steps) if success_steps else float("nan"),
    )


def default_task_sampler(size: int = 5, n_objects: int = 3) -> TaskSampler:
    def sampler(rng: random.Random) -> Task:
        return sample_task(rng, size=size, n_objects=n_objects)

    return sampler


def mixed_difficulty_sampler(
    sizes: Sequence[int] = (3, 5, 9), n_objects: int = 3
) -> TaskSampler:
    """Prompts whose *expected return* differs a lot from one to the next.

    A 3x3 grid is nearly free; a 9x9 grid within the same step budget is hard.
    This is the regime where a single global baseline is a poor predictor of any
    individual prompt, and where a per-prompt group baseline should help.
    """

    def sampler(rng: random.Random) -> Task:
        return sample_task(rng, size=rng.choice(list(sizes)), n_objects=n_objects)

    return sampler
