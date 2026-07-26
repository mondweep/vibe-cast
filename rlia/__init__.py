"""Reinforcement learning for instructed agents -- a stdlib-only teaching lab."""

from .algos import (
    GRPO,
    REINFORCE,
    EvalResult,
    default_task_sampler,
    evaluate,
    mixed_difficulty_sampler,
    rollout,
)
from .env import (
    ACTIONS,
    COLORS,
    SHAPES,
    InstructionGridWorld,
    Instruction,
    Obj,
    Task,
    feature_dim,
    features,
    sample_task,
)
from .policy import SGD, Adam, LinearSoftmaxPolicy, kl, make_optimizer, softmax

__all__ = [
    "ACTIONS",
    "Adam",
    "COLORS",
    "SHAPES",
    "GRPO",
    "REINFORCE",
    "SGD",
    "EvalResult",
    "Instruction",
    "InstructionGridWorld",
    "LinearSoftmaxPolicy",
    "Obj",
    "Task",
    "default_task_sampler",
    "evaluate",
    "feature_dim",
    "features",
    "kl",
    "make_optimizer",
    "mixed_difficulty_sampler",
    "rollout",
    "sample_task",
    "softmax",
]
