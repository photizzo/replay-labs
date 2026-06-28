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

If npm requires the package to exist before trusted publishing can be configured, do a one-time bootstrap publish from the npm account that will own the package, then immediately configure trusted publishing before subsequent releases.

Bootstrap command:

```bash
npm publish --access public --provenance
```

Only use this once if npm does not allow trusted publishing setup before the package exists.

## Normal Release

1. Update `package.json` version.
2. Run `npm test`.
3. Run `npm pack --dry-run` and inspect the file list.
4. Commit the version change.
5. Create a GitHub release with tag `vX.Y.Z`.
6. GitHub Actions runs `.github/workflows/publish.yml`.
7. Verify:

```bash
npm view replay-labs version
npx replay-labs --help
```

## Rules

- Do not publish from a local machine for normal releases.
- Do not commit generated reports, screenshots, app data, or real transcripts.
- Do not bypass GitHub push protection.
- Do not publish if tests or npm dry-run fail.

