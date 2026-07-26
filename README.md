# Reinforcement Learning for Instructed Agents

> A [Vibe Cast](https://github.com/mondweep/vibe-cast) branch — part of the build-in-public
> learning lab by **[Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty)**.
> This is an **orphan branch**: it shares no history with `main` and stands entirely on its own.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](#run-it)

An **instructed agent** is one that is told what to do at run time and has to work out how.
This branch asks the question that sits underneath RLHF, RLAIF and RLVR:

> When an agent is given an instruction and a reward that only says *"you did the task"* or
> *"you didn't"* — no demonstrations, no per-step supervision — what does it actually take to
> make it learn?

Everything here is **pure Python standard library**. No numpy, no torch, no GPU. Every gradient
is derived by hand and finite-difference checked in the test suite, because the point is to see
the mechanism rather than to call `.backward()` on it.

---

## TL;DR

A linear softmax policy learns to follow `"go to the green ball"` in a gridworld full of
distractors, from a `+1 / -1` terminal reward alone — reaching **81%** success against a
hand-coded ceiling of **81%**, from an untrained baseline of **26%**.

Four things this made concrete, all reproducible below:

1. **The optimiser mattered more than the algorithm.** Same objective, same rollouts:
   Adam **81%**, tuned SGD **59%**.
2. **The KL anchor is what stopped it collapsing.** Without it, three seeds gave 82% / 58% / 27%.
   With it, 81% / 83% / 79%.
3. **GRPO did not beat REINFORCE here** (81% vs 83%) — and the honest reason is that this task
   is too small for the group baseline to pay for itself.
4. **Length normalisation was not a detail.** Summing gradients over a trajectory instead of
   averaging left the agent stuck near 10%, because failure is long and success is short.

---

## The task

A `5x5` grid holds three mutually distinguishable objects — say a red key, a blue ball and a
green ball. The agent gets an instruction naming exactly one of them:

```
go to the green ball
 .  .  .  .  .
 .  @  BB .  .
 RK .  .  .  .
 .  .  .  .  .
 .  .  GB .  .
```

Four actions (`up`/`down`/`left`/`right`). The episode ends the moment the agent steps on **any**
object, so it cannot sweep the grid touching everything until something pays out:

| Event | Reward |
|---|---|
| Steps on the instructed object | `+1`, episode ends |
| Steps on a distractor | `-1`, episode ends |
| Every step | `-0.02` |
| Runs out of steps (20) | `0`, episode ends |

That reward is **verifiable**: correctness is decided by the environment, not by a learned reward
model. This is deliberately the RLVR setting — the one where you can trust the signal, and where
the interesting failures are optimisation failures rather than reward-model failures.

The instruction is not a free label. Objects sit in a canonical slot order (sorted by colour then
shape) that is independent of which one is the target, and the "does this object match?" flag is
computed by comparing each object's attributes to the parsed instruction. The policy has to read
the instruction to know where to go.

---

## The learning problem

Both learners maximise the same objective:

```
J(theta) = E[ R(tau) ]  -  beta * KL( pi_theta || pi_ref )
```

They differ only in **where the baseline comes from**:

- **REINFORCE** subtracts a running average of recent returns — one *global* baseline, so an easy
  prompt and a hard prompt are both compared against the same number.
- **GRPO** rolls the *same* prompt out `G` times and standardises returns **within that group**.
  The baseline is per-prompt, and no value network is needed — which is exactly why it is the
  workhorse for instruction-tuned LLMs, where a critic the size of the policy is unaffordable.

Three implementation details turned out to carry most of the weight:

**Length normalisation.** GRPO's objective averages over the trajectory rather than summing. With
a raw sum, a 20-step timeout contributes five times the gradient of a 4-step success purely
because it is longer — the update is dominated by failure, and the agent learns mostly what not
to do. This alone was the difference between ~10% and a policy that trains.

**The KL anchor, which here *is* an entropy bonus.** With a uniform reference policy the two are
the same object, and the derivation is short. Since `KL = -H + log|A|` for uniform `pi_ref`:

```
d KL / d z_j  =  p_j * (log(p_j / q_j) - KL)  =  p_j * (log p_j + H)  =  -dH / dz_j
```

So subtracting KL from the objective adds exactly an entropy bonus. That is not a coincidence to
be filed away — it is the mechanism that keeps the policy from collapsing onto one action early
and never exploring again, which is precisely how this agent failed before the anchor was tuned up.

**Per-parameter step sizes.** The features that actually encode the instruction (`match * dx`,
`match * dy`) are non-zero for only one object in three, so their gradients are chronically
smaller than the bias terms'. A single global learning rate either crawls on the features that
matter or diverges on the ones that don't.

---

## Results

Fixed `5x5` grid, 3 objects, 20-step limit. 400 updates x 64 rollouts = 25,600 episodes per run.
**3 seeds** each, evaluated greedily on **500 held-out tasks**. `+/-` is population standard
deviation across seeds.

| Setup | Success | Wrong object | Timeout | Mean reward |
|---|---|---|---|---|
| Untrained, sampling actions | 25.8% | 49.0% | 25.2% | -0.446 |
| Untrained, greedy | 8.2% | 17.8% | 74.0% | -0.403 |
| GRPO + SGD *(tuned: lr 1.0, beta 0.2)* | 58.7% <sub>+/- 6.8</sub> | — | 23.3% | +0.270 |
| GRPO + Adam, **no KL anchor** | 55.7% <sub>+/- 22.3</sub> | 18.3% | 25.9% | +0.227 |
| **GRPO + Adam** | **81.1%** <sub>+/- 1.4</sub> | 17.9% | 1.0% | +0.567 |
| **REINFORCE + Adam** | **83.1%** <sub>+/- 0.4</sub> | 16.1% | 0.9% | +0.606 |
| *Hand-coded oracle (ceiling)* | *81.0%* | *19.0%* | *0.0%* | *+0.560* |

Reading the table honestly:

**Untrained greedy is worse than untrained random (8% vs 26%), and that is not a bug.** An
all-zeros policy is uniform, so `argmax` ties and always returns the same action — the agent walks
into a wall for 20 steps. Sampling at least explores. It is a small reminder that a greedy
decode of an unconverged policy can look far more broken than the policy actually is.

**The ~81% ceiling is a policy-class limit, not a training failure.** A hand-coded weight matrix
that moves along whichever axis is furthest from the target scores 81.0%, with the residual 19%
lost to distractors sitting on the direct path. Both learners reach that ceiling, and the
remaining error is almost entirely `wrong object` rather than `timeout` — the agent has learned to
navigate, and what it lacks is the capacity to *detour*. A policy that could route around
distractors needs feature interactions this linear model does not have.

**The no-KL ablation is the most interesting row.** Its mean of 55.7% is nearly meaningless: the
three seeds were 82%, 58% and 27%. The run that worked and the run that collapsed differ only in
the random seed. Averaged results hide this completely — which is why every row here is reported
with its spread.

### Does the group baseline ever pay off?

GRPO losing to REINFORCE by 2 points is worth taking seriously rather than explaining away. The
likely reason is prompt diversity: at 64 rollouts per update, REINFORCE sees 64 distinct prompts
while GRPO sees only 8 (each rolled out 8 times). GRPO spends its sampling budget on a better
baseline; REINFORCE spends it on coverage. On a task this homogeneous, coverage wins.

So the setup was changed to make prompts genuinely unequal — grids of `3x3`, `5x5` and `9x9` mixed
together, where expected return varies enormously from one prompt to the next and a single global
baseline is a poor predictor of any of them (`--mixed-difficulty`):

| Algorithm | Success | Timeout | Mean reward |
|---|---|---|---|
| GRPO | 75.9% <sub>+/- 1.7</sub> | 3.7% | +0.478 |
| REINFORCE | 74.4% <sub>+/- 3.2</sub> | 6.4% | +0.466 |

GRPO edges ahead and is roughly twice as stable across seeds — but **1.5 points across 3 seeds is
within noise, and this is not a demonstration that GRPO wins.** It is a hint in the direction the
theory predicts, at a scale far too small to confirm it. The real case for GRPO is that it drops
the value network entirely, which matters when the critic would be a second 70B model and not
when it would be 64 floats.

---

## Run it

No install step, no dependencies — Python 3.9+ and the standard library.

```bash
git clone -b claude/orphan-branch-reinforcement-learning-cqe34g \
    https://github.com/mondweep/vibe-cast.git rl-instructed-agents
cd rl-instructed-agents

python -m rlia.train                       # GRPO, tuned defaults (~1 min)
python -m rlia.train --demo                # ...and print a greedy episode at the end
python -m rlia.train --algo reinforce      # the global-baseline comparison
```

Reproduce each finding in the table directly:

```bash
python -m rlia.train --kl-coef 0.0 --seed 2      # entropy collapse: ~27%
python -m rlia.train --kl-coef 0.0 --seed 0      # same config, ~82% -- that is the point
python -m rlia.train --optimizer sgd --lr 1.0 --kl-coef 0.2   # tuned SGD
python -m rlia.train --mixed-difficulty --algo grpo
```

`--demo` renders the learned policy acting. Below, the agent starts one step from a blue ball
distractor and walks around it to reach the green ball:

```
go to the green ball          -> down                      -> down
 .  .  .  .  .                 .  .  .  .  .                .  .  .  .  .
 .  @  BB .  .                 .  .  BB .  .                .  .  BB .  .
 RK .  .  .  .                 RK @  .  .  .                RK .  .  .  .
 .  .  .  .  .                 .  .  .  .  .                .  @  .  .  .
 .  .  GB .  .                 .  .  GB .  .                .  .  GB .  .

-> right                      -> down
 .  .  .  .  .                 .  .  .  .  .
 .  .  BB .  .                 .  .  BB .  .
 RK .  .  .  .                 RK .  .  .  .
 .  .  @  .  .                 .  .  .  .  .
 .  .  GB .  .                 .  .  @  .  .            outcome: success  return: +0.90
```

Full option list via `python -m rlia.train --help`.

### Tests

```bash
python -m unittest discover tests -v      # 19 tests, ~20s
```

The suite is the reason to trust the numbers above. It finite-difference checks both the policy
gradient and the KL gradient against the analytic implementations, asserts the environment's
reward contract, verifies that a seeded run is bit-for-bit reproducible, and trains both
algorithms end-to-end to assert they clear the untrained baseline by a wide margin.

---

## Code map

| File | What lives there |
|---|---|
| `rlia/env.py` | `InstructionGridWorld`, task sampling, the instruction-conditioned feature map |
| `rlia/policy.py` | Linear softmax policy, hand-derived log-prob and KL gradients, SGD and Adam |
| `rlia/algos.py` | `GRPO`, `REINFORCE`, rollout collection, evaluation |
| `rlia/train.py` | CLI, training loop, the `--demo` renderer |
| `tests/test_rlia.py` | Gradient checks, environment contract, determinism, learning assertions |

About 1,100 lines end to end — roughly 875 of implementation and 244 of tests.

---

## Honest limits

- **A gridworld is not a language model.** Trajectory-level advantages, KL-to-reference and group
  baselines are the same machinery LLM post-training uses, but token-level credit assignment over
  a 50k-way vocabulary is a different problem in practice.
- **The reward is verifiable by construction**, which quietly removes the hardest part of RLHF.
  Nothing here says anything about reward models or reward hacking — see the extensions.
- **A linear policy caps out at ~81%.** The ceiling is honest, but it means these results measure
  optimisation, not representational capacity.
- **Three seeds is few.** Enough to show the no-KL run is unstable; not enough to call a
  1.5-point gap.

## Where to take it next

1. **Reward hacking, on purpose.** Replace the verifiable reward with a learned one — train a
   small reward model on the environment's judgements, then optimise against it and watch the gap
   between true and proxy reward open up. That gap is the entire reason KL anchors exist.
2. **A non-linear policy** — one hidden layer, still by hand — to see whether it learns to detour
   around distractors and break the 81% ceiling.
3. **Compositional instructions**: `"go to the red key, then the green ball"`, which needs memory
   and turns this into a genuine sequence-credit-assignment problem.
4. **DPO on the same task.** Collect preference pairs from the group rollouts GRPO already
   produces and optimise the DPO objective instead — same data, no RL loop.
5. **PPO clipping with multiple inner epochs.** This implementation takes one gradient step per
   batch of fresh rollouts, which makes the importance ratio identically 1 and the clip a no-op.
   It is left out rather than faked; reusing a batch is what makes it earn its place.

## Reading

- Williams (1992), *Simple statistical gradient-following algorithms* — REINFORCE.
- Schulman et al. (2017), *Proximal Policy Optimization Algorithms* — the clipped objective.
- Ziegler et al. (2019) / Stiennon et al. (2020) — RLHF and the KL-to-reference anchor.
- Bai et al. (2022), *Constitutional AI* — RLAIF, where the feedback is a model.
- Shao et al. (2024), *DeepSeekMath* — GRPO and the group-relative advantage.
- Rafailov et al. (2023), *Direct Preference Optimization* — the same objective without the RL loop.
- Chevalier-Boisvert et al. (2018), *BabyAI* — the instruction-following gridworld this task is a
  deliberately miniature echo of.

---

MIT licensed. Part of [Vibe Cast](https://github.com/mondweep/vibe-cast) — one repo, many lives.
