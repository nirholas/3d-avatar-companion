# AGENTS.md

Operating notes for AI coding agents (Claude Code, Codex, Cursor, Copilot and others) working in this repository. Everything here is derived from the files actually in the tree, so trust it over guesses, and update it when the facts change.

## What this repository is

Animated 3D avatar that walks and talks over your website - 3D avatar mascot with stroll & platformer modes.

- Homepage: https://nirholas.github.io/3d-avatar-companion/
- Source: https://github.com/nirholas/3d-avatar-companion
- Primary language: JavaScript
- License: Other (see the LICENSE file)

## Repository layout

- `docs/`
- `src/`
- `test/`
- `types/`
- `README.md`
- `LICENSE`
- `package.json`

Tests live in `test/`. Add or update a test next to the code you change.

## Setup

```bash
npm install
```

## Commands

| Task | Command |
|---|---|
| build | `npm run build` |
| test | `npm test` |

Run the test and lint commands above before you consider a change finished. If a command fails on code you did not touch, say so in your report instead of silently skipping it.

## Conventions

- Commit messages follow Conventional Commits (`type(scope): summary`), matching the existing history.
- Read the surrounding code before adding to it, and match its naming, file organisation and error-handling style.
- Keep `README.md` accurate: if a change alters behaviour, commands or configuration, update the docs in the same commit.
- Do not leave TODO comments, stub functions, placeholder data or commented-out code behind. Finish what you start or leave it out.
- Small, focused commits with a subject line that describes the change, not the act of committing.

## Where to raise things

- Bugs and feature requests: https://github.com/nirholas/3d-avatar-companion/issues
- Questions and ideas: https://github.com/nirholas/3d-avatar-companion/discussions
- Security issues: report privately at https://github.com/nirholas/3d-avatar-companion/security/advisories/new, never in a public issue.
