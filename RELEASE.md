# Release Guide

## TypeScript

### First time setup

For PR linking and author attribution, you'll need a GitHub Personal Access Token.

1. Go to https://github.com/settings/tokens and create a GitHub PAT with `read:user` and `repo:status` scopes. This is for author attribution
2. Export your token in your shell (`export GITHUB_TOKEN={YOUR_TOKEN}`), and optionally save it to your shell profile (`echo "\nexport GITHUB_TOKEN={YOUR_TOKEN}" >> ~/.zshrc`)

### Publishing

Follow these steps to publish a new version of the TypeScript CDP SDK.

1. Ensure you are on the `main` branch and have the latest changes
2. Create a new branch for your changes, e.g. `release/ts`. The branch name doesn't matter, and you will delete this branch after the release
3. From the `typescript` folder, run `pnpm changeset:version` to automatically bump the version and create a new changelog. Make note of the new version, as this will be used in subsequent steps
4. Add and commit the changes with the message: `chore: bump @coinbase/cdp-sdk to {NEW_VERSION}`
5. Push your branch, create a PR and get an approval
6. Once approved, merge your PR
7. Once merged, manually trigger the [Publish @coinbase/cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/typescript_publish.yml) workflow
8. Once the workflow has completed, go back to the `main` branch and pull the latest changes
9. Tag the new version with `git tag -s @coinbase/cdp-sdk@v{NEW_VERSION} -m "Release @coinbase/cdp-sdk {NEW_VERSION}"`
10. Push the tag with `git push origin @coinbase/cdp-sdk@v{NEW_VERSION}`
11. Delete your release branch

## Python

Follow these steps to publish a new version of the Python CDP SDK.

1. Ensure you are on the `main` branch and have the latest changes
2. Create a new branch for your changes, e.g. `release/py`. The branch name doesn't matter, and you will delete this branch after the release
3. Calculate the new version by looking at the files in the `changelog.d` folder:
   - If there is a file ending in `removal.md`, this is a **major** version bump
   - If there is a file ending in `feature.md`, this is a **minor** version bump
   - If there is a file ending in `bugfix.md`, this is a **patch** version bump
   - For example, if the current version is `1.0.0` and there is both a `123.feature.md` and `456.bugfix.md`, the new version will be `1.1.0`
4. Update the version number in the following files in the `python/` folder with the new version:
   - `pyproject.toml`
   - `cdp/__version__.py`
   - `docs/conf.py`
5. Run `uv run towncrier build --yes --version={NEW_VERSION}` to update the changelog
6. Add and commit all the changes with the message: `chore: bump cdp-sdk to {NEW_VERSION}`
7. Push your branch, create a PR and get an approval
8. Once approved, merge your PR
9. Once merged, manually trigger the [Publish cdp-sdk](https://github.com/coinbase/poc-cdp-sdk/actions/workflows/python_publish.yml) workflow
10. Once the workflow has completed, go back to the `main` branch and pull the latest changes
11. Tag the new version with `git tag -s cdp-sdk@v{NEW_VERSION} -m "Release cdp-sdk {NEW_VERSION}"`
12. Push the tag with `git push origin cdp-sdk@v{NEW_VERSION}`
13. Delete your release branch
