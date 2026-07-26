"""CLI: train an instructed agent with REINFORCE or GRPO.

    python -m rlia.train --algo grpo
    python -m rlia.train --algo reinforce --iters 300
    python -m rlia.train --algo grpo --kl-coef 0.0 --demo
"""

from __future__ import annotations

import argparse
import random

from .algos import (
    GRPO,
    REINFORCE,
    default_task_sampler,
    evaluate,
    mixed_difficulty_sampler,
    rollout,
)
from .env import ACTIONS, InstructionGridWorld, feature_dim
from .policy import LinearSoftmaxPolicy


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="rlia.train",
        description="Reinforcement learning for instruction-following agents.",
    )
    p.add_argument("--algo", choices=("grpo", "reinforce"), default="grpo")
    p.add_argument("--iters", type=int, default=400, help="policy updates")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--lr", type=float, default=0.05)
    p.add_argument("--optimizer", choices=("adam", "sgd"), default="adam")
    p.add_argument("--kl-coef", type=float, default=0.02, help="0 disables the anchor")
    p.add_argument("--group-size", type=int, default=8, help="GRPO rollouts per prompt")
    p.add_argument("--prompts", type=int, default=8, help="GRPO prompts per batch")
    p.add_argument("--batch-size", type=int, default=64, help="REINFORCE rollouts per batch")
    p.add_argument("--grid-size", type=int, default=5)
    p.add_argument(
        "--mixed-difficulty",
        action="store_true",
        help="sample grids of 3/5/9 so prompt difficulty varies (ignores --grid-size)",
    )
    p.add_argument("--objects", type=int, default=3)
    p.add_argument("--max-steps", type=int, default=20)
    p.add_argument("--eval-tasks", type=int, default=500)
    p.add_argument("--log-every", type=int, default=25)
    p.add_argument("--demo", action="store_true", help="print one greedy episode at the end")
    return p


def run(args: argparse.Namespace) -> float:
    rng = random.Random(args.seed)
    env = InstructionGridWorld(max_steps=args.max_steps)
    sampler = (
        mixed_difficulty_sampler(n_objects=args.objects)
        if args.mixed_difficulty
        else default_task_sampler(size=args.grid_size, n_objects=args.objects)
    )
    policy = LinearSoftmaxPolicy(feature_dim(args.objects), env.n_actions)
    reference = policy.clone()  # uniform policy -- the KL anchor

    if args.algo == "grpo":
        trainer = GRPO(
            policy,
            env,
            sampler,
            group_size=args.group_size,
            prompts_per_batch=args.prompts,
            lr=args.lr,
            kl_coef=args.kl_coef,
            optimizer=args.optimizer,
            reference=reference,
        )
        budget = args.group_size * args.prompts
    else:
        trainer = REINFORCE(
            policy,
            env,
            sampler,
            batch_size=args.batch_size,
            lr=args.lr,
            kl_coef=args.kl_coef,
            optimizer=args.optimizer,
            reference=reference,
        )
        budget = args.batch_size

    print(
        f"algo={args.algo} optimizer={args.optimizer} seed={args.seed} "
        f"lr={args.lr} kl_coef={args.kl_coef} "
        f"rollouts/iter={budget} total_rollouts={budget * args.iters}"
    )
    print(f"before training: {evaluate(policy, env, sampler, args.eval_tasks)}")
    print(f"{'iter':>5}  {'train_reward':>12}  {'train_success':>13}  {'grad_norm':>9}")

    for i in range(1, args.iters + 1):
        stats = trainer.iterate(rng)
        if i % args.log_every == 0 or i == 1:
            print(
                f"{i:>5}  {stats.mean_reward:>12.3f}  {stats.success_rate:>12.1%}  "
                f"{stats.grad_norm:>9.3f}"
            )

    result = evaluate(policy, env, sampler, args.eval_tasks)
    print(f"after training:  {result}")

    if args.demo:
        print()
        demo_rng = random.Random(args.seed + 999)
        task = sampler(demo_rng)
        traj = rollout(env, policy, task, demo_rng, greedy=True)
        print(f"instruction: {task.instruction.text!r}  target at {task.target.pos}")
        env.reset(task)
        print(env.render())
        for step in traj.steps:
            env.step(step.action)
            print(f"\n-> {ACTIONS[step.action]}")
            print(env.render())
        print(f"\noutcome: {traj.outcome}  return: {traj.total_reward:+.2f}")

    return result.success_rate


def main() -> None:
    run(build_parser().parse_args())


if __name__ == "__main__":
    main()
