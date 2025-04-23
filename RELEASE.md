# Release Guide

## TypeScript

### First time setup

For PR linking and author attribution, you'll need a GitHub Personal Access Token.

1. Go to https://github.com/settings/tokens and create a GitHub PAT with `read:user` and `repo:status` scopes. This is for author attribution
2. Export your token in your shell (`export GITHUB_TOKEN={YOUR_TOKEN}`), and optionally save it to your shell profile (`echo "\nexport GITHUB_TOKEN={YOUR_TOKEN}" >> ~/.zshrc`)

### Publishing

Follow these steps to publish a new version of the TypeScript CDP SDK.

1. Ensure you are on the `main` branch and have the latest changes
1. Create a new branch for your changes, e.g. `release/ts`. The branch name doesn't matter, and you will delete this branch after the release
1. From the `typescript` folder, run `pnpm changeset:version` to automatically bump the version and create a new changelog. Make note of the new version, as this will be used in subsequent steps
1. Manually update `src/version.ts` with the new version
1. Add and commit the changes with the message: `chore: bump @coinbase/cdp-sdk to {NEW_VERSION}`
1. Push your branch, create a PR and get an approval
1. Once approved, merge your PR
1. Once merged, manually trigger the [Publish @coinbase/cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/typescript_publish.yml) workflow
1. Once the workflow has completed, go back to the `main` branch and pull the latest changes
1. Tag the new version with `git tag -s @coinbase/cdp-sdk@v{NEW_VERSION} -m "Release @coinbase/cdp-sdk {NEW_VERSION}"`
1. Push the tag with `git push origin @coinbase/cdp-sdk@v{NEW_VERSION}`
1. Delete your release branch
1. Trigger the [Deploy CDP SDK documentation to GitHub Pages](https://github.com/coinbase/cdp-sdk/actions/workflows/deploy-gh-pages.yml) action. Select `typescript` as the language to deploy

## Python

Follow these steps to publish a new version of the Python CDP SDK.

1. Ensure you are on the `main` branch and have the latest changes
1. Create a new branch for your changes, e.g. `release/py`. The branch name doesn't matter, and you will delete this branch after the release
1. Calculate the new version by looking at the files in the `changelog.d` folder:
   - If there is a file ending in `removal.md`, this is a **major** version bump
   - If there is a file ending in `feature.md`, this is a **minor** version bump
   - If there is a file ending in `bugfix.md`, this is a **patch** version bump
   - For example, if the current version is `1.0.0` and there is both a `123.feature.md` and `456.bugfix.md`, the new version will be `1.1.0`
1. Update the version number in the following files in the `python/` folder with the new version:
   - `pyproject.toml`
   - `cdp/__version__.py`
   - `docs/conf.py`
1. Run `uv run towncrier build --yes --version={NEW_VERSION}` to update the changelog
1. Add and commit all the changes with the message: `chore: bump cdp-sdk to {NEW_VERSION}`
1. Push your branch, create a PR and get an approval
1. Once approved, merge your PR
1. Once merged, manually trigger the [Publish cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/python_publish.yml) workflow
1. Once the workflow has completed, go back to the `main` branch and pull the latest changes
1. Tag the new version with `git tag -s cdp-sdk@v{NEW_VERSION} -m "Release cdp-sdk {NEW_VERSION}"`
1. Push the tag with `git push origin cdp-sdk@v{NEW_VERSION}`
1. Delete your release branch
1. Trigger the [Deploy CDP SDK documentation to GitHub Pages](https://github.com/coinbase/cdp-sdk/actions/workflows/deploy-gh-pages.yml) action. Select `python` as the language to deploy
