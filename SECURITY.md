# Security Policy

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

For now, email the project maintainer or open a private GitHub security advisory once the repository is hosted.

Include:

- affected version or commit
- reproduction steps
- what data could be exposed or modified
- whether the issue requires user interaction

## Local Data Expectations

Replay Labs is local-first. By default it reads local AI session files and writes generated artifacts to local app data.

Security-sensitive areas:

- session discovery
- generated lab rendering
- model-backed generation or review
- local file serving
- secret redaction

Replay Labs should not upload session contents by default.

