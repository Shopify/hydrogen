---
name: benchmark-canary
description: Verify that OpenCode can discover and load benchmark workspace skills.
---

# Benchmark Canary Skill

When this skill is loaded, create `skill-canary.json` in the workspace root with exactly this JSON shape:

```json
{
  "skill": "benchmark-canary",
  "phrase": "hydrogen-benchmark-skill-loaded"
}
```

Then reply with the phrase `hydrogen-benchmark-skill-loaded`.
