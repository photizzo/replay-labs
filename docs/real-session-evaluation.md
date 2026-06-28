# Real Session Evaluation

Replay Labs should be tested on real AI-assisted sessions before every public release, but real transcripts and generated outputs should not be committed.

## Evaluation Inputs

Use local-only sessions from:

- Claude Code
- Codex
- future supported session sources

Keep raw sessions, generated reports, screenshots, and QA scans outside git.

## Evaluation Matrix

For each release candidate, test at least:

- 5 sessions with concrete changed-code evidence
- 5 sessions with partial decision evidence
- 5 sessions from Codex
- 5 sessions from Claude
- 3 sessions with no usable lab evidence

For each session, record:

- source tool
- project grouping quality
- evidence classification
- whether a ready lab, generated lab, or decision map was produced
- whether the language felt honest and useful
- whether the user could identify what decision they now own

## Pass Criteria

A release candidate passes when:

- no private paths or secrets appear in public artifacts
- no decision-map-only session is mislabeled as a full lab
- mission framing is visible and coherent
- generated labs are blocked when evidence is too weak
- mobile and desktop inbox layouts remain usable
- core tests pass

## Public Fixtures

Public fixtures must be synthetic or carefully anonymized.

Do not commit:

- raw Claude/Codex transcripts
- personal project paths
- private screenshots
- generated local app data
- reports produced from private sessions

