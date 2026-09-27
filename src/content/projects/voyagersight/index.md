---
title: "VoyagerSight"
description: "A research project replicating NVIDIA's Voyager and extending it with vision, asking whether Minecraft LLM agents play better when they can see"
cover:
  image: ./cover.png
  alt: Spectating the Minecraft agent completing a task
  caption: Spectating the Minecraft agent completing a task
showToc: false
weight: 3
---

VoyagerSight started from [NVIDIA's Voyager](https://voyager.minedojo.org/), one of the first papers to show an LLM agent learning open-endedly in Minecraft: it writes its own code as skills, stores them in a library, and builds on them to explore further. Voyager's agent only ever read text about the world. Newer models can see, so the question I wanted to explore was simple: does an agent that can look at the world play differently?

**What the project involved:**

- **Replication.** Rebuilding Voyager's agent loop (automatic curriculum, iterative prompting with environment feedback, and a skill library) on newer, faster models.
- **Adding sight.** Feeding the agent screenshots from its own point of view alongside the text observations, so it could plan from what it sees.
- **Retrieval.** Using embeddings to pull relevant skills from the library for each new task.
- **Experiment design.** Setting up ablations in the spirit of the original paper, comparing text-only and multimodal agents on the same tasks.

What I took away from it was less about Minecraft and more about agents in general: how much of an agent's behavior comes from its prompt and memory design, why feedback loops matter more than raw model quality, and how hard it is to evaluate an agent fairly. Those lessons carry straight into the agentic engineering work I do today.

**Technologies Used:**

- [Python](https://www.python.org/)
- [LangChain](https://langchain.com/)
- [ChromaDB](https://docs.trychroma.com/docs/overview/introduction)
- [OpenAI](https://openai.com/)
- [Pandas](https://pandas.pydata.org/)
- [Google Colab](https://colab.research.google.com/)
