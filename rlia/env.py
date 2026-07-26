"""Instruction-conditioned gridworld.

The agent is dropped into a small grid containing several distinct objects and
is given a natural-language instruction ("go to the red key"). Only one object
satisfies the instruction; the others are distractors. The episode ends the
moment the agent steps onto *any* object, so the agent cannot brute-force its
way to reward by touching everything.

This gives us a **verifiable reward**: correctness is decided by the environment,
not by a learned reward model, which is exactly the setting modern
instruction-following RL (RLVR) targets.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Sequence, Tuple

COLORS: Tuple[str, ...] = ("red", "blue", "green")
SHAPES: Tuple[str, ...] = ("key", "ball")
ACTIONS: Tuple[str, ...] = ("up", "down", "left", "right")

# (dx, dy) per action index. y grows downwards.
_DELTAS: Tuple[Tuple[int, int], ...] = ((0, -1), (0, 1), (-1, 0), (1, 0))

# Features per object: dx, dy, match, match*dx, match*dy. Plus one global bias.
_FEATURES_PER_OBJECT = 5


@dataclass(frozen=True)
class Obj:
    color: str
    shape: str
    pos: Tuple[int, int]

    @property
    def sort_key(self) -> Tuple[int, int]:
        return (COLORS.index(self.color), SHAPES.index(self.shape))

    def __str__(self) -> str:
        return f"{self.color} {self.shape}"


@dataclass(frozen=True)
class Instruction:
    color: str
    shape: str

    @property
    def text(self) -> str:
        return f"go to the {self.color} {self.shape}"

    def matches(self, obj: Obj) -> bool:
        return obj.color == self.color and obj.shape == self.shape


@dataclass(frozen=True)
class Task:
    """A single prompt: one layout plus one instruction.

    GRPO needs to roll the *same* prompt out several times, so the task is a
    value object kept separate from the mutable environment.
    """

    size: int
    agent_start: Tuple[int, int]
    objects: Tuple[Obj, ...]  # canonical order, independent of which is the target
    instruction: Instruction

    @property
    def target(self) -> Obj:
        for obj in self.objects:
            if self.instruction.matches(obj):
                return obj
        raise ValueError("task has no object matching its instruction")


def feature_dim(n_objects: int) -> int:
    return _FEATURES_PER_OBJECT * n_objects + 1


def sample_task(
    rng: random.Random,
    size: int = 5,
    n_objects: int = 3,
) -> Task:
    """Sample a layout with `n_objects` mutually distinguishable objects."""
    combos = [(c, s) for c in COLORS for s in SHAPES]
    if not 1 <= n_objects <= len(combos):
        raise ValueError(f"n_objects must be in 1..{len(combos)}, got {n_objects}")

    picked = rng.sample(combos, n_objects)
    cells = rng.sample([(x, y) for x in range(size) for y in range(size)], n_objects + 1)

    objects = tuple(
        sorted(
            (Obj(color, shape, pos) for (color, shape), pos in zip(picked, cells)),
            key=lambda o: o.sort_key,
        )
    )
    target_color, target_shape = rng.choice(picked)
    return Task(
        size=size,
        agent_start=cells[-1],
        objects=objects,
        instruction=Instruction(target_color, target_shape),
    )


def features(task: Task, agent_pos: Tuple[int, int]) -> List[float]:
    """Observation the policy sees.

    Per object we expose its offset from the agent, whether it matches the
    instruction, and the product of the two. The `match` flag is derived by
    comparing the object's attributes to the parsed instruction, and objects sit
    in a canonical slot order, so the target's identity is never leaked by
    position in the vector -- the policy has to read the instruction.
    """
    ax, ay = agent_pos
    phi: List[float] = []
    for obj in task.objects:
        dx = (obj.pos[0] - ax) / task.size
        dy = (obj.pos[1] - ay) / task.size
        match = 1.0 if task.instruction.matches(obj) else 0.0
        phi.extend((dx, dy, match, match * dx, match * dy))
    phi.append(1.0)  # bias
    return phi


class InstructionGridWorld:
    """Episodic environment over a `Task`.

    Reward:
      * `+1`            for stepping onto the instructed object
      * `-1`            for stepping onto a distractor
      * `-step_cost`    every step, to favour short trajectories
      * `0` terminal    on timeout
    """

    n_actions = len(ACTIONS)

    def __init__(self, max_steps: int = 20, step_cost: float = 0.02) -> None:
        self.max_steps = max_steps
        self.step_cost = step_cost
        self.task: Task | None = None
        self.agent_pos: Tuple[int, int] = (0, 0)
        self.steps = 0
        self.done = True

    def reset(self, task: Task) -> List[float]:
        self.task = task
        self.agent_pos = task.agent_start
        self.steps = 0
        self.done = False
        return features(task, self.agent_pos)

    def step(self, action: int) -> Tuple[List[float], float, bool, dict]:
        if self.task is None or self.done:
            raise RuntimeError("call reset() before step()")
        if not 0 <= action < self.n_actions:
            raise ValueError(f"action must be in 0..{self.n_actions - 1}, got {action}")

        dx, dy = _DELTAS[action]
        x = min(max(self.agent_pos[0] + dx, 0), self.task.size - 1)
        y = min(max(self.agent_pos[1] + dy, 0), self.task.size - 1)
        self.agent_pos = (x, y)
        self.steps += 1

        reward = -self.step_cost
        info: dict = {"outcome": "running"}

        touched = next((o for o in self.task.objects if o.pos == self.agent_pos), None)
        if touched is not None:
            self.done = True
            if self.task.instruction.matches(touched):
                reward += 1.0
                info["outcome"] = "success"
            else:
                reward -= 1.0
                info["outcome"] = "wrong_object"
            info["touched"] = str(touched)
        elif self.steps >= self.max_steps:
            self.done = True
            info["outcome"] = "timeout"

        return features(self.task, self.agent_pos), reward, self.done, info

    def render(self) -> str:
        if self.task is None:
            return "<unreset environment>"
        glyphs = {o.pos: f"{o.color[0]}{o.shape[0]}".upper() for o in self.task.objects}
        rows = []
        for y in range(self.task.size):
            cells = []
            for x in range(self.task.size):
                if (x, y) == self.agent_pos:
                    cells.append(" @ ")
                else:
                    cells.append(f" {glyphs.get((x, y), '.'):<2}")
            rows.append("".join(cells))
        return f"{self.task.instruction.text}\n" + "\n".join(rows)
