---
description: Release a new version of the CDP SDK for a specific language (typescript, python, or rust)
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, AskUserQuestion
---

# Release CDP SDK

This command guides you through releasing a new version of the CDP SDK for a specific language.

## Arguments

$ARGUMENTS should be one of:
- `ts` or `typescript` - Release the TypeScript SDK
- `py` or `python` - Release the Python SDK
- `rust` - Release the Rust SDK

If $ARGUMENTS is empty or invalid, ask the user which language they want to release.

## Pre-flight Checks

Before starting the release process:

1. Verify we are on the `main` branch:
   ```bash
   git branch --show-current
   ```
   If not on `main`, ask the user if they want to switch to `main`.

2. Ensure the working directory is clean:
   ```bash
   git status --porcelain
   ```
   If there are uncommitted changes, warn the user and ask if they want to proceed.

3. Pull the latest changes:
   ```bash
   git pull origin main
   ```

---

## TypeScript Release

Follow these steps if $ARGUMENTS is `ts` or `typescript`:

### Step 1: Create Release Branch

Create a new branch for the release:
```bash
git checkout -b bump/ts
```

If the branch already exists, ask the user if they want to delete it and create a new one.

```bash
git branch -D bump/ts
git checkout -b bump/ts
```

### Step 2: Run Changeset Version

From the `typescript` folder, run the changeset version command to bump the version and generate changelog:
```bash
cd typescript && pnpm changeset:version
```

Display the output to the user and identify the new version number.

### Step 3: Read Current Version

Read the current version from package.json to confirm:
```bash
cat src/package.json | grep '"version"'
```

Ask the user to confirm the new version number.

### Step 4: Update version.ts

Read the current `src/version.ts` file and update it with the new version:
```bash
cat src/version.ts
```

Then edit the file to update the version string to match the new version.

### Step 5: Commit Changes

Stage and commit the changes:
```bash
git add .
git commit -m "chore: bump @coinbase/cdp-sdk to {NEW_VERSION}"
```

### Step 6: Push and Create PR

Push the branch and create a PR:
```bash
git push -u origin bump/ts
```

Provide the user with instructions to:
1. Create a PR from the `bump/ts` branch
2. Get approval and merge the PR

### Step 7: Post-Merge Instructions

Display these instructions to the user that they should follow after the PR is merged:

> **Post-merge steps (manual):**
>
> 1. Manually trigger the [Publish @coinbase/cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/typescript_publish.yml) workflow
>
> 2. Once the workflow completes, run these commands:
>    ```bash
>    git checkout main
>    git pull origin main
>    git tag -s @coinbase/cdp-sdk@v{NEW_VERSION} -m "Release @coinbase/cdp-sdk {NEW_VERSION}"
>    git push origin @coinbase/cdp-sdk@v{NEW_VERSION}
>    git branch -d bump/ts
>    ```

---

## Python Release

Follow these steps if $ARGUMENTS is `py` or `python`:

### Step 1: Create Release Branch

Create a new branch for the release:
```bash
git checkout -b bump/py
```

If the branch already exists, ask the user if they want to delete it and create a new one.

```bash
git branch -D bump/py
git checkout -b bump/py
```

### Step 2: Calculate New Version

Read the current version from pyproject.toml:
```bash
grep '^version = ' python/pyproject.toml
```

Then check the changelog.d folder to determine the version bump type:
```bash
ls -la python/changelog.d/
```

Explain the version calculation to the user:
- If there is a file ending in `removal.md` → **major** version bump
- If there is a file ending in `feature.md` → **minor** version bump
- If there is a file ending in `bugfix.md` → **patch** version bump

Ask the user to confirm the new version number.

### Step 3: Update Version Files

Update the version in the following files:

1. `python/pyproject.toml` - Update the `version = "X.Y.Z"` line
2. `python/cdp/__version__.py` - Update the version string
3. `python/docs/conf.py` - Update the version/release strings

Read each file first, then edit it with the new version.

### Step 4: Run Towncrier

Run towncrier to update the changelog:
```bash
cd python && uv run towncrier build --yes --version={NEW_VERSION}
```

### Step 5: Commit Changes

Stage and commit all changes:
```bash
git add python/
git commit -m "chore: bump cdp-sdk to {NEW_VERSION}"
```

### Step 6: Push and Create PR

Push the branch and create a PR:
```bash
git push -u origin bump/py
```

Provide the user with instructions to:
1. Create a PR from the `bump/py` branch
2. Get approval and merge the PR

### Step 7: Post-Merge Instructions

Display these instructions to the user that they should follow after the PR is merged:

> **Post-merge steps (manual):**
>
> 1. Manually trigger the [Publish cdp-sdk](https://github.com/coinbase/cdp-sdk/actions/workflows/python_publish.yml) workflow
>
> 2. Once the workflow completes, run these commands:
>    ```bash
>    git checkout main
>    git pull origin main
>    git tag -s cdp-sdk@v{NEW_VERSION} -m "Release cdp-sdk {NEW_VERSION}"
>    git push origin cdp-sdk@v{NEW_VERSION}
>    git branch -d bump/py
>    ```

---

## Rust Release

Follow these steps if $ARGUMENTS is `rust`:

### Step 1: Create Release Branch

Create a new branch for the release:
```bash
git checkout -b bump/rust
```

If the branch already exists, ask the user if they want to delete it and create a new one.

```bash
git branch -D bump/rust
git checkout -b bump/rust
```

### Step 2: Calculate New Version

Read the current version from Cargo.toml:
```bash
grep '^version = ' rust/Cargo.toml | head -1
```

Then check the changelog.d folder to determine the version bump type:
```bash
ls -la rust/changelog.d/
```

Explain the version calculation to the user:
- If there is a file ending in `removal.md` → **major** version bump
- If there is a file ending in `feature.md` → **minor** version bump
- If there is a file ending in `bugfix.md` → **patch** version bump

Ask the user to confirm the new version number.

### Step 3: Update Cargo.toml

Read and update the version in `rust/Cargo.toml`:
```bash
cat rust/Cargo.toml
```

Edit the file to update the version.

### Step 4: Update Changelog

Run git cliff to update the changelog:
```bash
cd rust && git cliff --unreleased --tag v{NEW_VERSION} --prepend CHANGELOG.md
```

### Step 5: Clean Changelog.d

Remove all files from `rust/changelog.d/` except `.gitignore`:
```bash
find rust/changelog.d -type f ! -name '.gitignore' -delete
```

### Step 6: Commit Changes

Stage and commit all changes:
```bash
git add rust/
git commit -m "chore(rust): bump cdp-sdk to {NEW_VERSION}"
```

### Step 7: Push and Create PR

Push the branch and create a PR:
```bash
git push -u origin bump/rust
```

Provide the user with instructions to:
1. Create a PR from the `bump/rust` branch
2. Get approval and merge the PR

### Step 8: Post-Merge Instructions

Display these instructions to the user that they should follow after the PR is merged:

> **Post-merge steps (manual):**
>
> 1. Manually trigger the [Publish cdp-sdk (Rust)](https://github.com/coinbase/cdp-sdk/actions/workflows/rust_publish.yml) workflow
>
> 2. Once the workflow completes, run these commands:
>    ```bash
>    git checkout main
>    git pull origin main
>    git tag -s cdp-sdk-rust@v{NEW_VERSION} -m "Release cdp-sdk (Rust) {NEW_VERSION}"
>    git push origin cdp-sdk-rust@v{NEW_VERSION}
>    git branch -d bump/rust
>    ```

---

## Important Notes

- Always wait for user confirmation before proceeding to destructive or irreversible steps
- If any step fails, stop and report the error to the user
- The user must manually trigger the GitHub Actions workflows - this cannot be done via CLI
- Tags must be signed (`-s` flag) - ensure the user has GPG signing configured
- Do not push to the remote repository until the user has approved the changes
