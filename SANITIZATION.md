# Repository sanitization

This repository was scrubbed before public release.

## What was checked

- Committed file contents for emails, local paths, hostnames, API keys, phone numbers, and personal identifiers
- Android `local.properties`, `.env`, and build artifact paths in `.gitignore`
- Git commit author/committer metadata

## What was redacted or genericized

- Git author/committer rewritten from a local machine identity to a GitHub noreply address (`heroines-vs-blue-sharks-bot <272769682+prob-Avahh-real@users.noreply.github.com>`)
- Root `.gitignore` expanded to block `.env`, `local.properties`, and Android build outputs

## Intentionally retained

- Public football player names and squad data in `src/data/teams.js` (sourced from FIFA, CAF, BBC, etc.)
- Generic app id `game.pixel.heroinesbluesharks` (not tied to a personal machine)
- Third-party package lockfiles and Capacitor Android template files

## If you fork or re-clone

Never commit `local.properties`, `.env`, keystores (`.jks`, `.keystore`), or `android/app/build/` outputs. Run `npm install` locally; SDK paths stay on your machine only.
