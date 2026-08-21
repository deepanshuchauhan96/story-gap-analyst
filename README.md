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
scripts/xlsx-to-csv.js                       .xlsx -> CSV converter (dependency-free Node, no installs)
scripts/extract-text.js                      .pdf / .docx -> text converter (dependency-free Node, no installs)
docs/samples/autopay-enrollment/             small test kit: requirement (.md + real .pdf), 3 gapped stories (.csv + .xlsx)
docs/samples/card-dispute/                   bulk test kit: large Reg-E-flavored requirement (.md + 2-page .pdf),
                                             12 stories across 4 sprints (.csv + .xlsx), mixed quality incl. a
                                             no-coverage story
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
The requirement is a local `.md`, `.txt`, **`.pdf` or `.docx`**; the stories are a Jira export as **`.csv` or
`.xlsx`** (filter the issue navigator by the requirement label, then Export; needs at least Issue key, Summary,
Description). Binary formats are handled by two dependency-free Node scripts in `scripts/` — the agent runs them
itself in the terminal (VS Code shows an approval prompt for each command; the agent is instructed to run nothing
but these two scripts). Limits: scanned/image PDFs have no text layer — attach those in chat (Copilot vision) or
OCR them; `.doc` (old Word) is not supported — save as `.docx`.

## Sprint-based analysis
A sprint is just another scope filter, so both modes support it:
- Connected: `stories='labels = req-member-address-change AND sprint = "Sprint 12"'` (any JQL works)
- File mode: filter the issue navigator by sprint before exporting, and keep the **Sprint column** in the export.

Two report shapes — say which you want in the prompt (default is cumulative):
- **Sprint slice** — only that sprint's stories; the % is that sprint's *contribution*, not requirement
  completeness.
- **Cumulative snapshot** — all stories to date, rows tagged by sprint, saved under
  `docs/gap-analysis/<slug>/sprint-<name>/`. Because each sprint-end run is committed, the agent reads earlier
  snapshots and prints a trend: `Sprint 10: 28% → Sprint 11: 61% → Sprint 12: 100%` — the requirement's
  convergence over time. Run it as a sprint-end ritual (or from CI on a schedule) and the trend builds itself.

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
