# CDP Agent Skills

User-facing [Agent Skills](https://agentskills.io) for building with the CDP SDK. Install one into
your coding agent and it can wire up a CDP integration in your project without you pasting docs
into context.

```bash
npx skills add coinbase/cdp-sdk
```

Install a single skill:

```bash
npx skills add coinbase/cdp-sdk --skill build-x402-client
```

| Skill | Use when |
| --- | --- |
| [`build-x402-client`](./build-x402-client/SKILL.md) | You want your code to pay for a `402`-protected API |
| [`build-x402-server`](./build-x402-server/SKILL.md) | You want to charge for one of your own HTTP routes |

## These are not the repo's own agent instructions

`.cursor/skills/` holds skills for people working *on* this repo, such as
`bump-x402-dependencies`. Nothing in there ships to users. This directory is the opposite: it is
published, so treat every line as public API surface.

## These are not the Agentic Wallet skills

`coinbase/agentic-wallet-skills` (`pay-for-service`, `monetize-service`, ...) drive the `awal` CLI
so an agent can transact without any code. The skills here write CDP SDK code into a developer's
project. Both can be installed at once, so every skill in this directory states in its description
which side of that line it sits on.

## Maintaining

These skills quote SDK APIs and package names, so they rot with the SDK rather than with the prose.
When you change a public x402 surface in `typescript/` or `python/`, update the matching skill in
the same PR.

Two constraints that are easy to break by accident:

- **Link examples by absolute GitHub URL, not relative path.** Installation copies the skill
  directory into the user's agent skills folder, detached from this repo, so `../examples/...`
  resolves while you are editing and breaks for every installed copy.
- **Keep each skill self-contained.** Both are one file covering TypeScript and Python, and both
  sit a little over 250 lines. Sibling `references/` files are the escape hatch if one grows well
  past that, but splitting early costs more than it saves — an agent that has to follow a second
  hop is likelier to skip it.

Each skill mirrors a docs quickstart in the separate `cdp-docs` repo. Changing one means opening a
PR against the other in the same change:

- `build-x402-client` <-> https://docs.cdp.coinbase.com/x402/buyer/quickstart
- `build-x402-server` <-> https://docs.cdp.coinbase.com/x402/seller/quickstart

Both quickstarts already point readers here with an `npx skills add` tip, so a renamed or deleted
skill breaks a published page.
