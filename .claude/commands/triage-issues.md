---
description: Triage open GitHub issues - analyze priority, type, and recommend labels
allowed-tools: Bash(gh:*), Read, Grep, Glob
---

# Triage GitHub Issues

Triage open GitHub issues for the CDP SDK repository. Analyze each issue and recommend appropriate labels, priority, and next actions.

## Prerequisites

This command requires the GitHub CLI (`gh`) to be authenticated. Authentication can be provided via:

1. **Environment variable**: `GITHUB_TOKEN` or `GH_TOKEN`
2. **Command argument**: `--token <token>` passed in $ARGUMENTS
3. **GitHub CLI login**: Run `gh auth login` to authenticate interactively

## Step 0: Check GitHub Authentication

Before proceeding, verify GitHub CLI authentication:

```bash
gh auth status
```

If authentication fails and no token is available:

1. Check if `GITHUB_TOKEN` or `GH_TOKEN` environment variable is set
2. Check if `--token` was passed in $ARGUMENTS
3. If neither is available, stop and display this message to the user:

> **GitHub authentication required**
>
> This command needs a GitHub token with `repo` scope to read and manage issues.
>
> **Option 1: Generate a new token**
> [Click here to create a token with the required scopes](https://github.com/settings/tokens/new?description=CDP%20SDK%20Triage&scopes=repo)
>
> Then either:
> - Set it as an environment variable: `export GITHUB_TOKEN=<your-token>`
> - Or pass it as an argument: `/triage-issues --token <your-token> [filter]`
>
> **Option 2: Login via GitHub CLI**
> ```bash
> gh auth login
> ```

If a `--token` argument is provided, extract it from $ARGUMENTS and set it for subsequent `gh` commands using `GH_TOKEN=<token> gh ...`.

## Arguments

$ARGUMENTS supports:
- Optional filter: `bug`, `docs`, `security`, `all`, or a specific issue number. Defaults to `all`.
- Optional token: `--token <github_token>` to authenticate without environment variable.

## Step 1: Fetch Issues

First, fetch the open issues based on the filter:

- If $ARGUMENTS is a number, fetch that specific issue: `gh issue view <number> --json number,title,body,labels,createdAt,author,comments`
- If $ARGUMENTS is `bug`, `docs`, or `security`, search with that term
- Otherwise, fetch all open issues: `gh issue list --state open --limit 30 --json number,title,body,labels,createdAt,author`

## Step 2: Analyze Each Issue

For each issue, determine:

### 2.1 Issue Type
- **bug**: Something is broken, crashes, returns wrong results, or doesn't work as documented
- **enhancement**: New feature request or improvement to existing functionality
- **documentation**: Missing docs, unclear instructions, or documentation errors
- **question**: User asking how to do something (may indicate docs gap)
- **security**: Credential exposure, injection vulnerabilities, or other security concerns
- **invalid**: Spam, empty issues, or issues that don't make sense

### 2.2 Affected SDK Language
Determine which SDK(s) are affected based on:
- Explicit mentions of "TypeScript", "Python", "Go", "Rust"
- File paths mentioned (e.g., `typescript/`, `python/`)
- Code snippets in the issue
- Package names (`@coinbase/cdp-sdk` = TypeScript, `cdp-sdk` on PyPI = Python)

Label as: `typescript`, `python`, `go`, `rust`, or multiple if cross-cutting

### 2.3 Priority Assessment

**critical** - Apply if ANY of these:
- Security vulnerability with exploit potential
- Data loss or corruption
- Complete inability to use core SDK functionality
- Affects all users

**high** - Apply if ANY of these:
- Crashes or exceptions in common workflows
- Incorrect behavior that could cause financial loss
- Blocking issue with no workaround
- Security issue with limited exposure

**medium** - Apply if ANY of these:
- Bug with a reasonable workaround
- Missing feature that users are requesting
- Documentation gaps causing user confusion
- Performance issues

**low** - Apply if ANY of these:
- Minor inconvenience
- Edge case bugs
- Nice-to-have improvements
- Cosmetic issues

### 2.4 Complexity Estimate
- **small**: Can be fixed in a few lines, clear solution
- **medium**: Requires some investigation or touches multiple files
- **large**: Significant refactoring, new feature, or cross-SDK changes

### 2.5 Status Assessment
- **ready**: Issue is actionable and includes ALL of the following:
  - Clear reproduction steps (or clear description for enhancements/docs)
  - Environment info: Node.js/Python version, package manager version, SDK version
  - Expected vs actual behavior clearly stated
- **needs-info**: Issue is missing required information. Request:
  - SDK version (e.g., `@coinbase/cdp-sdk@1.40.0` or `cdp-sdk==0.15.0`)
  - Runtime version (e.g., Node.js 20.x, Python 3.11)
  - Package manager and version (e.g., pnpm 9.x, pip 24.x)
  - Minimal reproduction steps or code snippet
  - Full error message/stack trace if applicable
- **confirmed**: Issue has been reproduced by a maintainer
- **duplicate**: Already reported (link to original)
- **wontfix**: Out of scope or by design

**Important**: Most bug reports should start as `needs-info` unless they explicitly include environment details and reproduction steps. Feature requests and documentation issues have lighter requirements but should still specify which SDK language/version they relate to.

## Step 3: Generate Triage Report

Present findings in a markdown table:

| Issue | Type | Language | Priority | Complexity | Suggested Labels | Notes |
|-------|------|----------|----------|------------|------------------|-------|
| #123 Title | bug | typescript | high | small | `bug`, `typescript`, `high` | Clear repro steps |

## Step 4: Provide Recommendations

For each issue, provide:
1. **Suggested labels** to apply
2. **Next action**: needs-info response, ready for dev, close as invalid, etc.
3. **Draft response** if the issue needs-info or should be closed

## Step 5: Apply Labels (Optional)

Ask if the user wants to apply the suggested labels. If yes, use:
```bash
gh issue edit <number> --add-label "label1,label2"
```

For invalid/spam issues, ask before closing:
```bash
gh issue close <number> --reason "not planned" --comment "Closing as invalid/spam."
```

## Special Cases

### Security Issues
- Flag prominently with ⚠️
- Recommend private disclosure if it's a real vulnerability
- Check if it's already been addressed in recent commits

### Duplicate Detection
- Search for similar issues: `gh issue list --search "keyword" --state all`
- Link duplicates and recommend closing the newer one

### Stale Issues
- Issues older than 90 days with no activity may need a ping or closure
- Check if the issue still applies to the current SDK version
