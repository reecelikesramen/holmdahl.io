---
author: Reece Holmdahl
title: Which Claude Model and Effort Should You Default To?
description: I benchmarked Opus, Sonnet and Haiku 5.5 as unattended Claude Code sessions to find a default that costs about half as much as Opus on high effort
pubDate: 2026-10-12
tags: [ai, claude-code, benchmarks, developer-experience, llm]
draft: true
cover:
  image: ./cover.png
  alt: A scatter plot of cost per task against share of bug fixes solved, with Opus at low effort at about half the cost of Opus at high effort and three points lower
  caption: "Cost per task and share of 299 bug fixes solved, from the benchmark runs in this post"
showReadingTime: true
showToc: true
tocOpen: false
---

<!--
DRAFT, 2026-10-12. Sources: the benchmark archives in the project files (RESULTS.md, SUMMARY.md, METHODS.md).
Open: confirm how much of the harness and the plugin to link or publish. Opus low and Sonnet were NOT run on every set (see "What isn't proven").
-->

Most Claude Code spend comes from one of two habits: running Opus at high effort on everything, or running Sonnet and paying again when it doesn't solve the problem. I wanted a default that costs about half as much without a real drop in what gets solved. So late last week and over the weekend I ran a benchmark to find one.

I'm going to try the result on my team for two to three weeks and see if our spend drops. It hasn't been proven on a real codebase yet, so the numbers below are benchmark numbers. Treat the ranking as more reliable than the exact percentages.

The short version:

- **Default to Opus 5.5 at low effort.** About 3 points fewer bug fixes solved than Opus at high effort, at about half the cost and half the wait.
- **Raise the effort when the task pushes back,** in the same session. Don't switch models mid-session.
- **Start on Haiku 5.5 at medium effort when the task comes with tests** that define done. Otherwise don't.
- **Sonnet 5.5 didn't earn a default slot,** for reasons I'll get to.

## How I tested

Each candidate setup ran as an unattended `claude -p` session in a container holding the task's repo at its pre-fix commit. When the session ended, I graded the patch against the task's hidden tests and took cost and time from the session's own report. The git history was stripped so the fix couldn't be read out of the object store.

The tasks came from three public benchmarks:

- **SWE-bench Multilingual:** 300 real bug fixes from open-source projects in about nine languages. Opus runs were paired on 299 of them.
- **SWE-bench Pro, hard subset:** 15 multi-file tasks.
- **FeatureBench lite:** 23 longer tasks that add a feature to an existing codebase (26 in the set, 3 couldn't be graded on my machine because their reference solutions fail there).

I compared Opus, Sonnet and Haiku 5.5 at different effort levels, with and without subagents, advisors, reviewer passes and automatic routing. I fixed the acceptance bar before the 300-task run: a candidate passes if it solves no more than 3 points fewer than Opus high and costs half as much or less.

## Start on Opus at low effort

These are the 299 Multilingual tasks every Opus arm completed:

| Setup | Solved | Cost per task | vs Opus high | Median time |
|---|---|---|---|---|
| Opus high | 277 (92.6%) | $0.360 | 100% | 66s |
| Opus medium | 269 (90.0%) | $0.229 | 64% | 42s |
| Opus low | 268 (89.6%) | $0.197 | 55% | 32s |
| Opus low, 5-minute cache | 266 (89.0%) | $0.164 | 46% | 34s |

Opus low is 3.0 points behind Opus high (95% CI −5.8 to −0.2, McNemar p = 0.064). Opus medium and Opus low are indistinguishable: 7 tasks went one way and 8 the other. The gap to high is small but probably real, and what you get for it is half the cost and half the wait.

Strictly, Opus low doesn't clear my own bar. It's right at the 3-point margin, and at default settings it costs 55% of Opus high, not 50%. Cache lifetime matters here. Cache writes were roughly half the cost of an Opus session, and my first runs used the one-hour cache, which writes at twice the input rate. With the five-minute cache, Opus low drops to 46% of Opus high as run, but it also lands 3.7 points behind. Whether the shorter cache is worth it depends on how continuously you work, because a pause longer than five minutes means rewriting the whole cache.

Opus high does buy solves on hard tasks. On the 15 hard tasks, Opus at xhigh solved all 15 at about twice Opus high's cost ($2.48 against $1.18 per task, which solved 14). That's 15 tasks, so it's evidence that effort helps, not a measurement of how much.

## Raise effort when the task pushes back

If Opus low gets something wrong, loops, or the task is plainly hard (a subtle bug, a change across several files, anything you'd hesitate over yourself), run `/effort medium` or `/effort high` and continue in the same session. According to the Claude Code docs, changing effort on the 5.5 models keeps the prompt cache, so you pay for the extra thinking and not for re-reading the conversation. I relied on that for the design but didn't measure it separately.

Don't switch models mid-session. Each model has its own cache, so a switch re-bills everything so far.

I wanted this to be automatic, and every version of that failed:

- **Forced review pass or high effort up front** (in a plugin I wrote): solved about the same as Opus high and cost more, 105% and 111% of Opus high per task.
- **Predicting failure from the session itself.** I tested seven signals against the 52 failed sessions of my routing plugin: cost, time, turns, test runs, edits, patch size and the model's own "Verified" line. The AUCs ranged from 0.47 to 0.62, where 0.5 is a coin flip. Escalating the top 20 to 50% by any of them did no better than escalating at random. In 7 of 8 wrong fixes, the model still wrote "Verified".
- **An Opus judge that sees the task and the diff.** It caught 5 of 9 wrong Haiku fixes on the small set and 4 of 7 on the hard set, and flagged 4 of 21 and 3 of 8 correct ones. A Haiku-first ladder that escalated to Opus on the judge's objection solved 25 of 30 small and 11 of 15 hard tasks, and missed the rule I had set for it.

So the judgement call stays with you.

## Start on Haiku when the task comes with tests

I put the tests in the checkout, named them in the prompt, and told the agent they define done. On a 70-task sample, Haiku 5.5 at medium effort matched Opus low given the same tests:

| Setup (tests supplied) | Solved (estimated for 300) | Cost per task | vs Opus low |
|---|---|---|---|
| Haiku medium | 95.3% | $0.019 | 15% |
| Haiku low | 94.6% | $0.012 | 10% |
| Haiku high | 92.8% | $0.039 | 31% |
| Opus low | 94.6% | $0.126 | 100% |

The sample was stratified: 31 tasks where earlier runs disagreed, 30 easy ones and 9 hard ones that no earlier run had solved. Haiku with tests solved 29 of the 31 contested tasks and 7 of the 9 hard ones, where Opus high without tests solved 21 and none. The tests mattered more than the model.

Without tests, Haiku isn't a safe choice. On the 30 small fixes, Haiku with a build-and-test rule solved 21 against 27 for Opus low and 26 for Opus medium (70% against 87 to 90%). On the hard set it solved 8 of 15.

Two cautions. These tests were complete, because they were the grading tests themselves, which is the best case. With thin tests, expect worse. And the 70-task intervals are about ±5 points, so read this as a direction.

## Where Sonnet fits

I expected Sonnet to earn a middle slot. It didn't, and I'll be careful about what I measured, because it isn't what I first assumed.

I never ran plain Sonnet at high effort on all 300 tasks. The 300-task run covered my routing plugin, which sent requests with an objective check to Haiku and everything else to Sonnet at high. It was billed almost entirely as Sonnet (261 of 270 sessions). That arm solved 247 of 299 (82.6%) at $0.147 per task, 10 points behind Opus high. It's a fair read on Sonnet-heavy routing, but it isn't a clean Sonnet-versus-Opus number.

The direct Sonnet-at-high comparisons are on the smaller sets:

| Set | Sonnet high | Opus | Cost |
|---|---|---|---|
| 30 small fixes | 26/30 | Opus low 27/30 | $0.165 vs $0.186 |
| 15 hard tasks | 12/15 | Opus medium 14/15 | $0.327 vs $0.622 |
| 23 long feature tasks | 19/23 | Opus medium 21/23 | $1.66 vs $1.71 |

On the long tasks, Sonnet cost 76% of Opus high against 78% for Opus medium, and solved two fewer. On the hard set it's cheaper per task, but it solved two fewer there too. If a task fails and I rerun it, the savings are gone. Opus low was only run on the small and 300-task sets, so I don't have a direct Sonnet-versus-Opus-low comparison on the long tasks.

My conclusion is a rule of thumb, not a result. Where there are acceptance criteria, pick Haiku. For long-running or vaguer work, Opus saves the reruns, and Sonnet saves a bit of money at a lower success rate.

## Subagents didn't pay

I started from Anthropic's suggestion of Sonnet with an Opus advisor, and tried Haiku subagents and an orchestrator pattern for long sessions.

- Left alone, Sonnet almost never delegated: zero subagent or advisor calls in 30 of 30 sessions.
- Forcing delegation (the main session can't edit files itself) solved 18 of 30 against 26 for Opus medium, for about $0.02 less per task.
- Sonnet with an Opus advisor made 18 advisor calls on the hard set, solved 12 of 15 and cost $0.649 per task, about twice Sonnet alone with the same result.

## What isn't proven

- **These are public benchmark tasks,** so the models may have seen them. Relative comparisons between setups are less exposed to that than absolute scores.
- **Hidden tests are the only judge.** A patch that passes tests but is wrong for the user counts as solved.
- **Most arms ran on a subset.** Only the Opus arms and one plugin arm ran on all 300 tasks. The Haiku-with-tests result is a 70-task sample with wide intervals.
- **Cost is the session's reported cost.** For subscription runs it's an API-equivalent figure, and your usage limits are a different constraint I didn't measure.
- **Not tested on a real codebase yet.** That's what the next few weeks on my team are for.
- **One model generation.** Everything here is about the 5.5 models.

I'll write a follow-up with what the team numbers look like.
