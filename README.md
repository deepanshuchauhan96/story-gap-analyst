# Story Gap Analyst — audit Jira stories against a requirement

A GitHub Copilot custom agent that answers one question: **do the stories we already wrote actually cover the
requirement?** It reads a requirement and the existing Jira stories, grades every story checkpoint by checkpoint,
and produces one 5-column table:

| 1 · Existing story | 2 · Existing AC | 3 · Corrected story | 4 · Complete acceptance criteria | 5 · Completeness % |
|---|---|---|---|---|

Missing stories are drafted as extra `(none — gap) … 0%` rows **in the table only** — the agent is read-only toward
Jira and Confluence by construction (no write tools are granted). A checkpoint appendix makes every percentage
reproducible: reviewers argue with a specific checkpoint, not with a number.

## What's in here
```
.github/agents/story-gap-analyst.agent.md    the agent (read-only; writes only docs/gap-analysis/ output)
.github/prompts/analyze-gaps.prompt.md       /analyze-gaps requirement=<page name or file> stories=<label or CSV>
.github/gap-agent/gap-analysis-method.md     the completeness scoring method (checkpoints, 1.0/0.5/0.0)
.vscode/mcp.json                             Atlassian (Rovo) MCP server — the only dependency, and it is optional
docs/samples/                                a sample requirement (.md) + a deliberately incomplete Jira CSV export
docs/examples/1-first-audit-28pct/           real output: first audit, coverage 28%
docs/examples/2-after-fixes-100pct/          real output: same requirement after fixes were applied, 100%
```

## Two modes
**Connected mode** (Atlassian MCP available):
```
/analyze-gaps requirement="Member Address Change" stories=req-member-address-change
```
The agent finds the Confluence page by title (asks if several match), pulls every story carrying the label via JQL,
and runs the audit. Convention: one label per requirement (`req-<slug>`), applied when stories are written.

**File mode** (no Jira/Confluence API access — e.g. a restricted client environment):
```
/analyze-gaps requirement=docs/samples/requirement-member-address-change.md stories=docs/samples/stories-export.csv
```
The requirement is a local `.md`/`.txt`; the stories are a Jira CSV export (filter the issue navigator by the
requirement label, Export → CSV; needs at least Issue key, Summary, Description; `.xlsx` is not readable — use CSV).

## Setup (~10 min)
1. Copy `.github/` and `.vscode/` into the root of the repo where the team runs Copilot (merge `mcp.json` if one
   exists; keep the server key `atlassian`). File mode needs nothing else — skip step 2.
2. Connected mode only: Copilot org policy *MCP servers in Copilot* enabled; Atlassian Rovo MCP with Jira/Confluence
   **Read** allowed (no write permission is needed — the agent has no write tools); start the `atlassian` server in
   VS Code (*MCP: List Servers*) and complete the browser OAuth once.
3. Open the repo root, trust the workspace, open Copilot Chat with Session Target **Local**, pick
   **story-gap-analyst**, and try the file-mode command above — the sample CSV is deliberately incomplete, so a
   correct run reports roughly 28% coverage and drafts three missing stories.

## Output
`docs/gap-analysis/<slug>/gap-analysis.md` (table + checkpoint appendix + open questions) and `gap-analysis.csv`
(same table for Excel/sharing). See `docs/examples/` for a real before/after pair produced by this agent.

## Scoring method (summary — full rules in .github/gap-agent/gap-analysis-method.md)
Decompose the requirement into atomic testable checkpoints → map each to the story that should cover it → score
each 1.0 (stated explicitly) / 0.5 (mentioned, under-specified) / 0.0 (absent, judged on the written text only) →
story % = points ÷ applicable checkpoints; headline % = points ÷ all checkpoints. Unmapped checkpoints become
drafted NEW stories at 0%.
