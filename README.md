# provider-github

First-party GitHub provider for Tiinex — GitHub and GitHub-compatible source discovery, browsing, Git resolution and publication over provider-neutral Core and App contracts.

## Turn-2 boundary

Own GitHub-family source discovery, browse/git resolution and publication behavior outside provider-neutral Core and App.

The repository is intentionally bootstrapped with a minimal public module while Turn-2 extraction defines and qualifies the real runtime surface. Do not move implementation here merely to populate the package.

## Distribution

- npm: `@tiinex/provider-github`
- branch: `master`
- release policy: `.github/release-policy.json`
- bootstrap command after repository/package qualification: `npm run publish:bootstrap`

Publication remains a separate gate from source readiness and technical qualification.
