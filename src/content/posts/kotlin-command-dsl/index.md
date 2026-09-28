---
author: Reece Holmdahl
title: A Kotlin DSL for FRC Commands
description: Using Kotlin's type-safe builders to make WPILib command composition read like the code students already know
draft: true
pubDate: 2026-09-28
tags: [robotics, frc, kotlin, wpilib, dsl, developer-experience]
showReadingTime: true
showToc: true
tocOpen: false
---

<!--
DRAFT. Reece's own prose (Intro through "You'll notice the `+`") is kept as written, with only code
indentation normalized. Everything after that sentence was drafted from the robot-code-next repo
(main, feature/unit-tests, feature/kotlin-script-autos, feature/robot-state-hooks; PRs #8, #11, #12)
and the WPILib commands v3 design doc. "Q:" comments are interview questions for Reece; answers get
woven into the section they sit in. [Brackets] are placeholders for Reece's own words.
-->

## Intro

Syntax is a powerful thing for developer experience, just think about what JSX has done for the web development community— it doesn't introduce anything previously impossible in the browser, but it makes page manipulation clear and declarative. The structure and logic of a component living together in a module is extremely powerful, yet is only semantic.

```jsx
function Card() {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="card">
      <h2>Title</h2>
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide Details' : 'Show Details'}
      </button>
      {expanded && (
        <p className="details">Here are some extra details...</p>
      )}
    </div>
  );
}
```

```html
<div class="card">
  <h2>Title</h2>
  <button id="toggle">Show Details</button>
  <p id="details" class="details" style="display: none;">
    Here are some extra details...
  </p>
</div>

<script>
  const toggleBtn = document.getElementById('toggle');
  const details = document.getElementById('details');
  let expanded = false;

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    details.style.display = expanded ? 'block' : 'none';
    toggleBtn.textContent = expanded ? 'Hide Details' : 'Show Details';
  });
</script>
```

As a student, student mentor, and now an adult mentor in FIRST robotics, I have seen the challenge of teaching coding to students from a lot of different angles. I have always thought that we could do more within FIRST to make coding more accessible to students who have trouble getting over the initial learning curve that some of the abstractions created. I think that improving the syntax on top of the command-based structure will elevate the experience for new and proficient students.

```java
this.runOnce(() -> {
    desiredLevel = Level.minHeight;
    Angle r = inchesToRadians(desiredLevel.getHeight());
    io.setWinchPosition(r);
  })
  .andThen(Commands.waitUntil(isAtGoal()))
  .andThen(Commands.waitUntil(lowerLimitHit))
  .andThen(this.runOnce(() -> {
    io.setWinchOpenLoop(Volts.of(0));
  }))
  .withName("Elevator.minHeight");
```

<!--
NOTE: the DSL has no `named` infix today (CommandBuilder.kt only has then/with/timeout/until/unless/
onlyIf/onlyWhile). Either add a one-line `infix fun Command.named(name: String) = withName(name)` to
the repo, or show `.withName("Elevator.minHeight")` here. Also `run { }` with no requirements is
ignoringDisable(true) in the DSL; the Java version requires the elevator (`this.runOnce`), so the
faithful translation is `run(this) { ... }`.
-->

```kotlin
sequence {
  run {
    desiredLevel = Level.minHeight
    val r = inchesToRadians(desiredLevel.getHeight())
    io.setWinchPosition(r)
  }
  wait(isAtGoal())
  wait(lowerLimitHit)
  run {
    io.setWinchOpenLoopVolts(Volts.of(0))
  }
} named "Elevator.minHeight"
```

Here are some key advantages the structure introduced here in this example:

* Clear structure and hierarchy: The brackets and indentation imply structure and order more clearly than method chaining.
* Less verbose: Fewer important methods, classes, and programming structures to remember to get up and running.
   * The lambda has been a particular pain point with students.
* Imperative familiarity: `sequence` block implies execution order implicitly, wait delays execution of subsequent blocks.

## FRC Programming Paradigms

Focusing more specifically on FRC now, there are two main ways to code a robot, each with key pros and cons:

**Command-based:**

Pros:

* Easily modular
* Composable
* Structure is clear
* Teaches good lessons, SOLID

Cons:

* High abstraction
* Steep learning curve
* Verbose
* Not directly applicable outside of FRC

**Loop-based:**

Pros:

* Easy to understand
* High visibility
* Intuitive debugging
* Main loop structure is usual in many applications

Cons:

* Difficult to structure, need additional strategies
* Does not encourage teamwork
* Difficult to extend
* Lacks Subsystem requirements

Due to complex robots and large software teams, we have chosen to use the command-based structure for a long time now. I think that the command-based structure paired with mentors promoting good idioms develops good software engineers who are comfortable working in projects together and skilled at teamwork. However, there are still many pain points that we have with the command-based structure for onboarding new students, most notably, the learning curve and readability.

## Kotlin?

It seems that there is a particular balance to maintain between explicit and implicit for comprehension in new students. Java is explicit, you tell it exactly what to do and it does it, this can be a problem if you don't know how to do that. Python is more implicit, and I find that students can get up and running quicker with fewer roadblocks. Switching to Kotlin helps balance the benefits of switching to Python vs. sticking with Java. The support and ecosystem for Java in FRC is enormous, and by moving to Kotlin you at least maintain some of that. You have first-class support from vendors and libraries and FTAs can likely still help you debug since it runs on the JVM.

My goal is that switching to Kotlin will get students up and running faster by spending less time learning syntax and using less brain power digesting Java's verbosity.

Learning to write commands in FRC is difficult for A) new students and B) students acquainted with basic imperative programming. Learning the command structure for WPILib has made composing high level robotics systems easier than writing everything in periodic, which is its design intent, but command composition often ends up verbose and unclear.

<!--
Q: The repo README says "We plan on switching to Kotlin for the 2026 season." It's now after the 2026
season. Did 2220 actually run Kotlin (and this DSL) on the 2026 robot? If yes, this paragraph should
move to past tense and say how it went; if not, what's the current plan?
-->

My team, 2220, is in the process of switching from Java to Kotlin for our robot code. We hope that it will make robot code as a whole less verbose and make coding more accessible to the younger students.

The command framework and scheduler is a robust and well-tested system— we do not desire to replace it. This is why leveraging typesafe builders to make a custom Kotlin DSL for commands (and autos) was a direction I tried.

Here is an example that I believe shows the clear increase in readability and structure. This command composition was used during competition this year.

<!-- Q: "this year" = the 2025 season (Reefscape)? Worth naming the season since the post is dated after 2026. -->

```java
DriveCommands.FullSnapperOuterAuto(drive).alongWith(elevator.L0())
  .andThen(DriveCommands.FullSnapperInner(drive).alongWith(elevator.L4()))
  .andThen(outtake.depositCoral())
  .andThen(DriveCommands.FullSnapperOuter(drive).alongWith(elevator.L0()))
```

and with the Kotlin DSL:

<!-- NOTE: the Java calls FullSnapperInner but the Kotlin calls FullSnapperInnerAuto (same in the repo README). Pick one. -->

```kotlin
sequence {
  parallel {
    +DriveCommands.FullSnapperOuterAuto(drive)
    +elevator.l0
  }
  parallel {
    +DriveCommands.FullSnapperInnerAuto(drive)
    +elevator.l4
  }
  +outtake.depositCoral
  parallel {
    +DriveCommands.FullSnapperOuter(drive)
    +elevator.l0
  }
}
```

You'll notice the `+` in front of each command that already exists. Inside a block, calling one of the DSL's own functions (`run`, `wait`, `print`, a nested `sequence`) adds that command to the block for you. A command you built somewhere else, like `elevator.l4`, is just a value, and a value sitting alone on a line in a Kotlin lambda doesn't go anywhere. The `+` is how you say "this one belongs in the block too." It's the same convention [kotlinx.html](https://github.com/Kotlin/kotlinx.html) uses, where `+"text"` adds a text node to the element you're inside.

<!-- ^ Drafted (not Reece's words). Q: Did the `+` trip students up, or did it click quickly? Did you consider alternatives (e.g. `add(elevator.l4)` or `elevator.l4()`)? -->

## Scoped properties

Because each block is an object at runtime, it can carry state that belongs to that block and nothing else. The one I use most is time. Every block records when it started, and `elapsed` is a Kotlin delegated property that reads the time since then:

```kotlin
sequence {
  // startTime is provided by the sequence in this scope
  print { "outer started at $startTime sec" }

  val outerElapsed by elapsed
  repeat {
    print { "time since outer block started: $outerElapsed sec" }
    wait(0.5)
  } timeout 3.0

  sequence {
    // elapsed is scoped to this block, so innerElapsed is how long this sequence has been running
    val innerElapsed by elapsed
    print { "inner started at $startTime sec" }
    wait(3.0)
    print { "time since inner block started: $innerElapsed sec" }
    print { "time since outer block started: $outerElapsed sec" }
  }

  print { "all done!" }
}
```

Doing this with plain WPILib means a field or a captured array holding a timestamp, a `runOnce` to set it at the right moment, and remembering which one belongs to which group. Here the nesting of the code is the nesting of the timers.

<!-- Q: Is there a real robot use for this beyond the demo (e.g. "if we've been intaking for > 2s, give up")? A real example would land better than prints. -->

## How it works

The whole DSL is one file, [`CommandBuilder.kt`](https://github.com/reecelikesramen/robot-code-next/blob/main/src/main/kotlin/com/eaganrobotics/frc/lib/commands/CommandBuilder.kt), and it sits entirely on top of WPILib. Every block builds a normal `Command` out of `Commands.sequence`, `Commands.parallel`, `Commands.race` and friends, so the scheduler, requirements and interruption behave exactly as they always have. The output can be mixed freely with Java-built commands in either direction.

<!-- Q: Is the repo public at github.com/reecelikesramen/robot-code-next, or should links point to EaganRobotics/robot-code-next? -->

The core is Kotlin's [type-safe builder](https://kotlinlang.org/docs/type-safe-builders.html) pattern: a function that takes a lambda *with a receiver*. Inside the lambda, `this` is a scope object that collects commands:

```kotlin
fun sequence(block: SequentialScope.() -> Unit): Command {
  val builder = SequentialScope()
  builder.apply(block)   // run the student's block against the scope
  return builder.build() // turn what it collected into a WPILib command
}

abstract class CommandScope {
  protected var commands = mutableListOf<Command>()

  operator fun Command.unaryPlus(): Command {
    if (this !in commands) commands.add(this)
    return this
  }

  fun wait(seconds: Double, block: SequentialScope.() -> Unit = {}): Command {
    val cmd = com.eaganrobotics.frc.lib.commands.wait(seconds, block)
    +cmd
    return cmd
  }

  // run, loop, print, defer, parallel, race, repeat, ifElse... follow the same shape
}

class SequentialScope : CommandScope() {
  override fun _build() = Commands.sequence(*commands.toTypedArray())
}

class ParallelScope : CommandScope() {
  override fun _build() = Commands.parallel(*commands.toTypedArray())
}
```

That's the whole trick: each scope is a list, the functions available inside it append to the list, and the scope's type decides which WPILib group the list becomes. There are four block scopes (`sequence`, `parallel`, `race`, `repeat(times)`) and two helpers that take blocks (`ifElse(condition, { ... }, { ... })` and `wait(timeOrCondition) { thenDoThis }`).

The DSL also keeps an inline style for short compositions, using Kotlin infix functions:

```kotlin
wait(1.0) then print { "one second later" }
elevator.l4 with outtake.prepare timeout 2.0
repeat { print { "tick" }; wait(0.5) } onlyWhile { DriverStation.isEnabled() }
```

<!-- NOTE: `outtake.prepare` is illustrative, not from the repo. Swap for a real 2220 command. -->

## Challenges

**Infix functions inside a block.** `run { ... } then wait(1.0)` looks like one thing to a reader, but Kotlin evaluates `run { ... }` first, which adds it to the block, then `wait(1.0)`, which adds that too, and only then calls `then`. Left alone, the block would run all three. So every infix function inside a scope pulls its operands back out of the list and puts the combined command where the left-hand one used to be. It's the least elegant code in the file, and it's what makes the inline and block styles mix without surprises.

**Name collisions.** A good DSL wants short words, and short words are taken. `run` and `repeat` are Kotlin standard library functions, and `until` is already an infix function in Kotlin (`0 until 10`). Scope members win over top-level functions inside a block, so the DSL versions take over where students use them. For `until`, `unless`, `onlyIf` and `onlyWhile`, the file grabs a reference to WPILib's Java method first (`private val _until = Command::until`) so the Kotlin infix version can call through to it without calling itself.

<!-- Q: Did the `run`/`repeat` shadowing ever confuse anyone, e.g. a student expecting Kotlin's `repeat(3) { }` to run immediately? -->

**Seeing what's running.** A DSL that hides structure in the source is worse if it also hides it on the robot. Wrapping groups made the default WPILib names ("SequentialCommandGroup") even less useful, so [PR #11](https://github.com/reecelikesramen/robot-code-next/pull/11) logs the full command tree to AdvantageKit as JSON, with descriptive names like `wait(3.0 sec)` and `wait(condition == false)`. Getting the children out of a WPILib group means reading its private fields (`m_commands`, `m_command`) with reflection, since WPILib doesn't expose them. The tree shows up in a [fork of AdvantageScope](https://github.com/EaganRobotics/AdvantageScope/releases/tag/v4.1.6-commands-alpha) I built for it, where you can scrub the timeline and watch which commands are active on each subsystem.

<!-- Q: Confirm you built the AdvantageScope fork (it's under EaganRobotics). One or two sentences on it: what the view looks like, whether students used it. A screenshot would make a good figure here. -->

**Testing against the scheduler.** On the `feature/unit-tests` branch I started testing the builder with [Kotest](https://kotest.io), running the real `CommandScheduler` in a loop and checking side effects at each point in time. That turned up a WPILib quirk: a `SequentialCommandGroup`'s `isFinished()` still returns false after it has finished ([allwpilib#7901](https://github.com/wpilibsuite/allwpilib/issues/7901)), so the test reads the group's current index through reflection instead.

<!-- Q: Confirm my reading of #7901 is right, and whether it's since been fixed upstream. -->

## Autos as scripts

Once commands read like a script, the obvious next step was to make autonomous routines actual scripts. [PR #12](https://github.com/reecelikesramen/robot-code-next/pull/12) loads every `*.auto.kts` file in the deploy directory with the Kotlin scripting host at startup. Each one runs against an `AutoScope`, the same builder with a name, a group, `timeLeft`, and path helpers:

```kotlin
name = "TestAuto"
group = "Test"

print { "Hello, world!" }
+Lift.it.l1

repeat(5) {
  wait(1.0)
  print { "Repeating this 5 times!" }
}

+robot.lift.intake

print { "All done!" }
```

Two things fall out of this. An auto that fails to compile is reported and skipped instead of crashing the robot program. And autos can be redeployed to a running robot: `deploy_autos.py` pushes any changed source over NetworkTables, the robot recompiles it and swaps it into the auto chooser, and the compiler's diagnostics come back to the laptop.

This took two attempts. The first, on `feature/kotlin-script-autos`, died on an unhelpful `source must not be null` error and I shelved it. A few days later I traced it to the classpath of the fat jar GradleRIO deploys. What worked was switching to the JSR-223 scripting artifact and excluding the `module-info.class` and signature files that collide when every dependency is merged into one jar.

<!-- Q: I inferred the cause from the "got it to work! classpath error with fat jar" commit. Is that the right story? -->

<!--
Q: How long does compiling an auto take on the roboRIO? Did hot-deploying autos get used at an event or
in practice, and did it change how students iterated on autos?
Q: `path()` and `trajectory()` are stubs in the repo. Did they get wired to Choreo or PathPlanner?
-->

## Alternatives: WPILib commands v3

WPILib is tackling the same readability problem from a different direction. [Commands v3](https://github.com/wpilibsuite/allwpilib/blob/main/design-docs/commands-v3.md), in alpha for the 2027 season, lets you write a command as one imperative function. The function gets a `Coroutine` and calls `coroutine.yield()` to hand control back to the scheduler each loop:

```java
Command command = Command.noRequirements(coroutine -> {
  initialize();
  while (!isFinished()) {
    execute();
    coroutine.yield();
  }
  end();
}).named("MyCommand");
```

That's a real improvement for exactly the student I'm worried about: code that reads top to bottom, with loops and ifs that work the way they already know. It also adds priorities and makes names mandatory.

The costs, from the design doc: it's built on `jdk.internal.vm.Continuation`, an internal JDK API (the one behind virtual threads) that has to be opened with JVM flags; it needs Java 21, so it's for the 2027 control system and not the roboRIO; it's designed for a single-threaded program; and it is a new framework rather than a layer over the one teams already know, so v2 command code and habits don't carry over directly.

<!--
Q: What are the "other pitfalls" you had in mind? Candidates to confirm: continuations are an internal
API that could change between JDK releases; mistakes like forgetting to yield in a loop hang the
scheduler (alpha 7 added compile-time checks for some misuse); it's still alpha; Kotlin/Python support.
Q: Did you consider Kotlin's own coroutines (suspend functions) for an imperative style? That would be a
natural comparison for a Kotlin post.
Q: Would you port this DSL onto v3 when 2220 moves to 2027, or does v3 make it unnecessary?
-->

The DSL makes the opposite trade: it changes nothing about how commands run, so it works today on any robot with WPILib's existing framework, but it is still declarative composition underneath. You describe the tree up front; you don't write a loop that runs over time.

## Conclusion

[Reece: the one thing you want a reader to take away. Draft direction below.]

The command-based framework is good engineering, and I don't want students to skip it. What I want is for the first week with it to be about robots instead of lambdas and method chains. A few hundred lines of Kotlin on top of WPILib got most of the way there: the structure of the code is the structure of the behavior, and nothing underneath had to change.

<!-- Q: Is any of this going to be published as a library other teams could use? If so, link it here. -->
