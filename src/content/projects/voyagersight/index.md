---
title: "VoyagerSight"
description: "A research project replicating NVIDIA's Voyager and giving its Minecraft agent sight, to test whether LLM agents play better when they can see"
cover:
  image: ./cover.png
  alt: The VoyagerSight agent in Minecraft beside a terminal showing the JavaScript it wrote to kill a cow
  caption: The agent carrying out a task in Minecraft, next to the code it wrote to do it
showToc: true
weight: 3
---

VoyagerSight is a research project that replicates [NVIDIA's Voyager](https://voyager.minedojo.org/) and gives its agent sight. Voyager was one of the first papers to show an LLM agent learning open-endedly in Minecraft. Its agent only ever reads text about the world, and newer models can see, so I wanted to know whether an agent that can look at the world plays better.

<!-- TODO(Reece): when was this, and was it a course project, a team, or solo? Which models did
you use? Is the code or write-up public anywhere? -->

**Technologies Used:**

- [Python](https://www.python.org/)
- [LangChain](https://langchain.com/)
- [ChromaDB](https://docs.trychroma.com/docs/overview/introduction)
- [OpenAI](https://openai.com/)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Pandas](https://pandas.pydata.org/) and [Google Colab](https://colab.research.google.com/)

---

# How It Works

Voyager's agent runs a loop. A curriculum proposes the next task based on what the agent has and has done. The agent writes JavaScript against the Mineflayer bot API to do it, runs the code in the game, and reads back chat messages, errors, and the state of the world. It revises the code until the task succeeds, then saves the working function to a skill library it can call from later code.

I rebuilt that loop on newer, faster models, including Voyager's skill retrieval, which stores skills as embeddings in ChromaDB and pulls the most relevant ones into the prompt for each task. Then I added two things:

- **Sight.** Each prompt includes a screenshot from the agent's point of view alongside the text observations, so it can plan from what it sees.
- **Ablations.** Following the original paper, I set up experiments that run text-only and multimodal agents on the same tasks.

---

# What I Learned

<!-- TODO(Reece): what did the ablations show? Did the multimodal agent do better, worse, or
just differently? One or two concrete numbers or examples here would make this page. -->

Most of what I took away was about agents in general, not Minecraft. An agent's behavior comes as much from its prompt and memory design as from the model. The feedback loop of running code, reading errors, and retrying did more for reliability than a stronger model did. And evaluating an agent fairly is hard. I use those lessons in the agentic engineering work I do today.
