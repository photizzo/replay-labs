# Contributing to Replay Labs

Replay Labs is a local-first tool that turns AI-assisted technical work sessions into mission-based learning labs.

## Development

Requirements:

- Node.js 20 or newer

Run the local app:

```bash
node ./src/cli.js --no-open
```

Run tests:

```bash
npm test
```

## Contribution Standard

Keep the codebase calm and easy to review.

- Keep user data local by default.
- Do not add hidden network calls.
- Do not commit generated labs, screenshots, local session scans, or app data.
- Add focused tests for behavior changes.
- Avoid broad rewrites unless the ownership boundary is genuinely changing.
- Use comments only for non-obvious constraints.
- Keep UX copy plain and honest about evidence quality.

## Privacy Bar

Replay Labs reads private local session files. Treat privacy as product behavior, not polish.

- Do not upload session content by default.
- Do not send session content to a model unless a user explicitly enables that path.
- Redact or avoid rendering likely secrets.
- Avoid committing real user transcripts, local paths, screenshots, or generated reports.

## Pull Requests

Before opening a pull request:

- Run `npm test`.
- Check that `git status --short` does not include generated output.
- Explain what user flow changed.
- Explain any privacy or local data implications.

