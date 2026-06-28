# Release Process

Replay Labs publishes to npm from GitHub Actions, not from a developer laptop.

## npm Trusted Publishing

Use npm Trusted Publishing for the `replay-labs` package.

Configure the package on npm with:

- Publisher: GitHub Actions
- Organization/user: `photizzo`
- Repository: `replay-labs`
- Workflow: `publish.yml`
- Environment: `npm`

The publish workflow uses OIDC (`id-token: write`) and npm provenance. Do not add an `NPM_TOKEN` unless trusted publishing is unavailable for the package.

## First Publish

The first npm publish for `replay-labs@0.1.0` was completed with a temporary bootstrap token.

After bootstrap:

- Delete or revoke the bootstrap npm token.
- Keep future releases on Trusted Publishing only.
- Do not restore the bootstrap workflow unless npm Trusted Publishing becomes unavailable.

## Normal Release

Releases are tag-driven. The tag is the publish trigger.

1. Update the package version:

```bash
npm version patch
```

Use `minor` or `major` instead of `patch` when the release requires it.

2. Push the release commit and tag:

```bash
git push origin main --follow-tags
```

3. GitHub Actions runs `.github/workflows/publish.yml` from the pushed `vX.Y.Z` tag.

The workflow:

- Verifies the tag matches `package.json`.
- Runs `npm test`.
- Runs `npm pack --dry-run`.
- Publishes to npm through Trusted Publishing.
- Creates the matching GitHub Release.

4. Verify:

```bash
npm view replay-labs version
npx replay-labs --help
```

## Manual Preflight

Before creating the version tag, it is still reasonable to run:

```bash
npm test
npm pack --dry-run
```

This catches package mistakes before a tag starts the publish workflow.

## Release Rules

1. Do not publish from a local machine for normal releases.
2. Run `npm test`.
3. Run `npm pack --dry-run` and inspect the file list.
4. Do not commit generated reports, screenshots, app data, or real transcripts.
5. Do not bypass GitHub push protection.
6. Do not publish if tests or npm dry-run fail.
