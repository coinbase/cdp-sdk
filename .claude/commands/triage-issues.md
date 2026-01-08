---
description: Triage open GitHub issues and PRs - analyze priority, type, and recommend labels
allowed-tools: Bash(gh:*), Bash(curl:*), Read, Grep, Glob
---

# Triage GitHub Issues and Pull Requests

Triage open GitHub issues and pull requests for the CDP SDK repository. Analyze each item and recommend appropriate labels, priority, and next actions.

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
- Optional filter: `bug`, `docs`, `security`, `prs`, `all`, or a specific issue/PR number. Defaults to `all`.
- Optional GitHub token: `--token <github_token>` to authenticate without environment variable.
- Optional Linear token: `--linear-token <linear_api_key>` to enable Linear ticket creation.

## Step 1: Fetch Issues and PRs

### Fetching Issues

First, fetch the open issues based on the filter:

- If $ARGUMENTS is a number, fetch that specific issue: `gh issue view <number> --json number,title,body,labels,createdAt,author,comments`
- If $ARGUMENTS is `bug`, `docs`, or `security`, search with that term
- If $ARGUMENTS is `prs`, skip issue fetching and only fetch PRs
- Otherwise, fetch all open issues: `gh issue list --state open --limit 100 --json number,title,body,labels,createdAt,author`

### Fetching Pull Requests

After fetching issues (unless filter is a specific issue number), also fetch open PRs from external contributors:

```bash
gh pr list --state open --limit 100 --json number,title,author,createdAt,labels,isDraft
```

For each PR, check the author association to determine if it's from an external contributor:

```bash
gh api repos/coinbase/cdp-sdk/pulls/<number> --jq '{number, title, author: .user.login, authorAssociation: .author_association}'
```

**Filter out internal PRs** - Skip PRs where `author_association` is:
- `MEMBER` - GitHub org member (Coinbase employee)
- `COLLABORATOR` - Has direct push access (likely internal)
- `OWNER` - Repository owner

**Include external PRs** - Triage PRs where `author_association` is:
- `CONTRIBUTOR` - External contributor with prior merged PRs
- `FIRST_TIME_CONTRIBUTOR` - External contributor's first PR
- `FIRST_TIMER` - First-ever GitHub contribution
- `NONE` - No prior association

Also skip:
- Draft PRs (`isDraft: true`) - not ready for review
- PRs from bot accounts (`author.is_bot: true`)

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

## Step 2b: Analyze Each External PR

For each external PR (non-internal contributor), determine:

### 2b.1 PR Type
- **bug-fix**: Fixes a reported bug or issue
- **feature**: Adds new functionality
- **documentation**: Updates docs, README, comments
- **chore**: Maintenance, dependency updates, CI changes
- **refactor**: Code improvements without behavior change

### 2b.2 Affected SDK Language
Same as issues - determine from file paths in the PR:
- Files in `typescript/` → `typescript`
- Files in `python/` → `python`
- Files in `go/` → `go`
- Files in `rust/` → `rust`

### 2b.3 PR Quality Assessment

**ready-for-review** - PR is ready for team review if ALL:
- Has clear description of changes
- Includes tests (if applicable)
- Passes CI checks (if visible)
- Linked to an issue (if fixing a bug)

**needs-work** - PR needs attention from author:
- Missing description or context
- No tests for new functionality
- Failing CI checks
- Breaking changes without documentation

**needs-discussion** - PR requires architectural discussion:
- Large refactoring
- New dependencies
- API changes
- Security-sensitive changes

**spam/invalid** - PR should be closed:
- Nonsensical title or description (e.g., unrelated text, gibberish)
- Empty or placeholder content
- No meaningful code changes
- Suspicious patterns (e.g., "fix my account", random words)

**superseded** - PR is duplicated by another:
- Another PR contains the same fix plus more
- Check file overlap between PRs with similar purposes

### 2b.4 Linked Issues

Check if the PR references any issues:
- Look for "Fixes #123", "Closes #123", "Resolves #123" in PR body
- Note linked issues in the triage report
- If PR fixes a triaged issue, update the issue status

## Step 3: Generate Triage Report

Present findings in separate tables for issues and PRs.

### Issues Table

| Issue | Type | Language | Priority | Complexity | Suggested Labels | Status |
|-------|------|----------|----------|------------|------------------|--------|
| #123 Title | bug | typescript | high | small | `bug`, `typescript`, `high` | ready |

### External PRs Table

| PR | Type | Language | Author | Status | Linked Issues | Notes |
|----|------|----------|--------|--------|---------------|-------|
| #456 Title | bug-fix | typescript | @contributor | ready-for-review | Fixes #123 | Clean fix with tests |

Note: Internal PRs (from MEMBER/COLLABORATOR authors) are excluded from this report.

## Step 4: Provide Recommendations

### For Issues
1. **Suggested labels** to apply
2. **Next action**: needs-info response, ready for dev, close as invalid, etc.
3. **Draft response** if the issue needs-info or should be closed

### For External PRs
1. **Review priority**: Should this be reviewed soon, or can it wait?
2. **Suggested reviewers**: Based on affected SDK language
3. **Concerns**: Any red flags (security, breaking changes, missing tests)
4. **Next action**: Request changes, approve, request more info from author

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

### Stale PRs
- PRs older than 90 days may need attention:
  - Check if still relevant to current codebase
  - May need rebase due to conflicts
  - Author may have abandoned it
- Options: ping author, close as stale, or adopt if valuable

### Spam PRs
- Close PRs with nonsensical descriptions or titles
- Use: `gh pr close <number> --comment "Closing - this PR appears to be spam."`
- Common indicators: unrelated text in body, random words in title, no meaningful changes

### Superseded PRs
- When multiple PRs fix the same issue, keep the more comprehensive one
- Close the narrower PR with a comment linking to the better one
- Use: `gh pr close <number> --comment "Closing - this fix is included in #XXX which addresses the same issue."`

### PRs That Fix Triaged Issues
- When a PR fixes a triaged issue (e.g., "Fixes #345"), note this relationship
- If the PR is merged, the linked issue will auto-close
- Consider prioritizing review of PRs that fix high-priority issues

## Step 6: Create Linear Tickets (Optional)

For issues with status **ready** and PRs with status **ready-for-review**, offer to create Linear tickets to track the work. This step is optional and requires Linear API authentication.

### Linear Authentication

Linear API access can be provided via:
1. **Environment variable**: `LINEAR_API_KEY`
2. **Command argument**: `--linear-token <token>` passed in $ARGUMENTS

If Linear authentication is not available when the user wants to create tickets, display:

> **Linear authentication required**
>
> To create Linear tickets, you need a Linear API key.
>
> **Generate a new API key:**
> [Click here to create a Linear API key](https://linear.app/coinbase/settings/account/security)
>
> Then either:
> - Set it as an environment variable: `export LINEAR_API_KEY=<your-key>`
> - Or pass it as an argument: `/triage-issues --linear-token <your-key> [filter]`

### Linear Configuration

Use these values for the CDPSDK team:
- **Team ID**: `827cc285-1fc8-476d-99c4-1ef6f4f66524`
- **Team Key**: `CDPSDK`
- **Triage State ID**: `c1a4ca9a-55de-4623-8332-0c71f729b0c6`

### Priority Mapping

Map GitHub priority labels to Linear priority values:
| GitHub Label | Linear Priority |
|--------------|-----------------|
| `critical` | 1 (Urgent) |
| `high` | 2 (High) |
| `medium` | 3 (Medium) |
| `low` | 4 (Low) |
| (none) | 0 (No priority) |

### Creating Tickets for Issues

For each **ready** issue, prompt the user: "Create Linear ticket for #[number] [title]?"

If confirmed, create the ticket using the Linear GraphQL API:

```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }",
    "variables": {
      "input": {
        "teamId": "827cc285-1fc8-476d-99c4-1ef6f4f66524",
        "stateId": "c1a4ca9a-55de-4623-8332-0c71f729b0c6",
        "title": "[GitHub #<number>] <issue title>",
        "description": "<issue body summary>\n\n---\n**GitHub Issue:** https://github.com/coinbase/cdp-sdk/issues/<number>",
        "priority": <mapped_priority>
      }
    }
  }'
```

### Creating Tickets for PR Reviews

For each **ready-for-review** external PR, prompt the user: "Create Linear ticket to track review of PR #[number]?"

If confirmed, create the ticket with:
- **Title**: `[PR Review] #<number> <PR title>`
- **Description**: Summary of changes, linked issues, author, and review notes
- **Priority**: Based on linked issues (if PR fixes a high-priority issue, inherit that priority)
- **Link**: `https://github.com/coinbase/cdp-sdk/pull/<number>`

### After Ticket Creation

After successful creation, display the Linear ticket URL (e.g., `https://linear.app/coinbase/issue/CDPSDK-1234`).

**Important**: Do NOT update the GitHub issue/PR with the Linear link. The Linear ticket should contain the link back to GitHub, but not vice versa.
