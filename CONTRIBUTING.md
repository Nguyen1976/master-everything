# Contributing

Thanks for helping people master things.

## Good first contributions

- **Presets**: open, redistributable material bundles for a subject (`presets/<name>/preset.json` + `INDEX.md`). See [guide/MATERIALS.md](guide/MATERIALS.md#presets).
- **Languages**: question-card strings in the `STRINGS` table of `tutor/engine.mjs`.
- **Skills**: sharper workflows in `.claude/skills/`, especially for non-programming subjects (languages, maths, exam prep).
- **Engine tests** for edge cases.

## Ground rules

Read [AGENTS.md](AGENTS.md) first. In short: the engine owns mastery, setup stays simple, learner data is never committed, everything in the repository is in English, and the core stays subject-agnostic.

## Before opening a pull request

```bash
npm test
npm run doctor
```

For prompt or skill changes, describe in the PR a short session you ran with the change: what you typed, and what the tutor did differently.
