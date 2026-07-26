"""A tiny linear-softmax policy, written in plain Python.

No numpy, no torch. The point of this branch is that every gradient is visible
and hand-checkable -- see `tests/test_rlia.py`, which finite-difference checks
both the policy gradient and the KL gradient.
"""

from __future__ import annotations

import math
import random
from typing import List, Sequence

Matrix = List[List[float]]


def zeros(n_actions: int, n_features: int) -> Matrix:
    return [[0.0] * n_features for _ in range(n_actions)]


def softmax(logits: Sequence[float]) -> List[float]:
    top = max(logits)
    exps = [math.exp(z - top) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]


class LinearSoftmaxPolicy:
    """pi(a | phi) = softmax(W phi)."""

    def __init__(self, n_features: int, n_actions: int) -> None:
        self.n_features = n_features
        self.n_actions = n_actions
        self.W: Matrix = zeros(n_actions, n_features)

    def logits(self, phi: Sequence[float]) -> List[float]:
        return [sum(w * f for w, f in zip(row, phi)) for row in self.W]

    def probs(self, phi: Sequence[float]) -> List[float]:
        return softmax(self.logits(phi))

    def sample(self, phi: Sequence[float], rng: random.Random) -> int:
        probs = self.probs(phi)
        draw = rng.random()
        acc = 0.0
        for action, p in enumerate(probs):
            acc += p
            if draw < acc:
                return action
        return self.n_actions - 1  # float dust

    def greedy(self, phi: Sequence[float]) -> int:
        probs = self.probs(phi)
        return max(range(self.n_actions), key=probs.__getitem__)

    def clone(self) -> "LinearSoftmaxPolicy":
        copy = LinearSoftmaxPolicy(self.n_features, self.n_actions)
        copy.W = [row[:] for row in self.W]
        return copy

    def apply_gradient(self, grad: Matrix, lr: float) -> None:
        """Gradient *ascent* step: W <- W + lr * grad."""
        for row, grow in zip(self.W, grad):
            for d, g in enumerate(grow):
                row[d] += lr * g


def accumulate_logp_grad(
    grad: Matrix,
    phi: Sequence[float],
    probs: Sequence[float],
    action: int,
    weight: float,
) -> None:
    """grad += weight * d/dW log pi(action | phi).

    For a softmax over linear logits:
        d log pi(a*) / d W[a][d] = (1{a == a*} - pi(a)) * phi[d]
    """
    for a, p in enumerate(probs):
        coef = weight * ((1.0 if a == action else 0.0) - p)
        if coef == 0.0:
            continue
        row = grad[a]
        for d, f in enumerate(phi):
            row[d] += coef * f


def kl(probs: Sequence[float], ref_probs: Sequence[float]) -> float:
    """KL(pi || pi_ref), computed exactly -- the action space is tiny."""
    total = 0.0
    for p, q in zip(probs, ref_probs):
        if p > 0.0:
            total += p * math.log(p / max(q, 1e-12))
    return total


def accumulate_kl_grad(
    grad: Matrix,
    phi: Sequence[float],
    probs: Sequence[float],
    ref_probs: Sequence[float],
    weight: float,
) -> None:
    """grad += weight * d/dW KL(pi || pi_ref).

    d KL / d z_j = pi_j * (log(pi_j / pi_ref_j) - KL), and d z_j / d W[j][d] = phi[d].
    """
    divergence = kl(probs, ref_probs)
    for a, (p, q) in enumerate(zip(probs, ref_probs)):
        coef = weight * p * (math.log(max(p, 1e-12) / max(q, 1e-12)) - divergence)
        if coef == 0.0:
            continue
        row = grad[a]
        for d, f in enumerate(phi):
            row[d] += coef * f


class SGD:
    """Plain gradient ascent. Correct, and slow enough to be instructive."""

    name = "sgd"

    def step(self, policy: LinearSoftmaxPolicy, grad: Matrix, lr: float) -> None:
        policy.apply_gradient(grad, lr)


class Adam:
    """Adam, ascending.

    Policy-gradient estimates on this task differ in scale by orders of
    magnitude across features -- the `match * dx` features that actually encode
    the instruction are only non-zero for one object in three. Per-parameter
    step sizes matter far more here than the learning rate does.
    """

    name = "adam"

    def __init__(
        self,
        n_actions: int,
        n_features: int,
        beta1: float = 0.9,
        beta2: float = 0.999,
        eps: float = 1e-8,
    ) -> None:
        self.m = zeros(n_actions, n_features)
        self.v = zeros(n_actions, n_features)
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0

    def step(self, policy: LinearSoftmaxPolicy, grad: Matrix, lr: float) -> None:
        self.t += 1
        bias1 = 1.0 - self.beta1**self.t
        bias2 = 1.0 - self.beta2**self.t
        for a, row in enumerate(policy.W):
            m_row, v_row, g_row = self.m[a], self.v[a], grad[a]
            for d, g in enumerate(g_row):
                m_row[d] = self.beta1 * m_row[d] + (1.0 - self.beta1) * g
                v_row[d] = self.beta2 * v_row[d] + (1.0 - self.beta2) * g * g
                row[d] += lr * (m_row[d] / bias1) / (math.sqrt(v_row[d] / bias2) + self.eps)


def make_optimizer(name: str, policy: LinearSoftmaxPolicy):
    if name == "adam":
        return Adam(policy.n_actions, policy.n_features)
    if name == "sgd":
        return SGD()
    raise ValueError(f"unknown optimizer {name!r}")


def global_norm(grad: Matrix) -> float:
    return math.sqrt(sum(g * g for row in grad for g in row))


def clip_(grad: Matrix, max_norm: float) -> float:
    """Clip in place to `max_norm`; returns the pre-clip norm."""
    norm = global_norm(grad)
    if norm > max_norm and norm > 0.0:
        scale = max_norm / norm
        for row in grad:
            for d in range(len(row)):
                row[d] *= scale
    return norm
