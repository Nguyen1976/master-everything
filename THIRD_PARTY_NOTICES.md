# Third-party notices

## DeepTutor

Master Everything adapts design, prompts and policy constants from **DeepTutor**:

- Source: https://github.com/HKUDS/DeepTutor
- Copyright 2025 Data Intelligence Lab, The University of Hong Kong
- License: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

Adapted material, all modified (rewritten for Claude Code, translated into a CLI, and condensed):

| Master Everything | Adapted from (DeepTutor) |
|---|---|
| `CLAUDE.md` turn protocol, modes, teaching playbook | `deeptutor/capabilities/mastery/prompts/en/mastery_loop.yaml` |
| `CLAUDE.md` explanation order | `deeptutor/learning/prompts/en.yaml` (`explain`, `feynman`, `review`) |
| `CLAUDE.md` question-quality rules, `/quiz` pipeline | `deeptutor/agents/question/prompts/en/pipeline.yaml` |
| `/solve` | `deeptutor/capabilities/solve/prompts/en/system.md` |
| `/roadmap` intake and outline rules | `mastery_loop.yaml` (`intake_needed`, `session.outline`), `learning/prompts/en.yaml` (`topic`) |
| `learning/memory.md` rules | `deeptutor/services/memory/consolidator/prompts/en/_meta.yaml`, `update_l2.yaml` |
| `tutor/engine.mjs` gate, scoring, intervals | `deeptutor/learning/policy.py`, `mastery.py`, `scheduler.py` |
| `guide/AGENT_SETUP.md` structure, README "let your agent set it up" | `docs-for-user/AGENT_SETUP.md`, `README.md` |

No DeepTutor source files are redistributed. Master Everything is not affiliated with or endorsed by the DeepTutor authors.

## Preset materials

Presets contain only links to third-party repositories. Fetched materials keep their own licences (for example, javascript.info uses a CC BY-NC based licence, MDN content is CC BY-SA 2.5, and You Don't Know JS Yet is CC BY-NC-ND 4.0). They are downloaded to the user's machine and are never committed to this repository.
