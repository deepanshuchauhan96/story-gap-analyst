---
description: Audit existing Jira stories against a requirement and produce the 5-column gap table (no Jira/Confluence writes).
agent: story-gap-analyst
---
Run the gap analysis:
- Requirement: `${input:requirement:Confluence page name (preferred), URL/ID, or a local .md/.txt/.pdf/.docx file}`
- Stories: `${input:stories:requirement label (preferred, e.g. req-member-address-change), JQL, epic key, issue keys, or a local .csv/.xlsx Jira export}`

Follow your method file exactly: decompose into checkpoints, score each story, correct and complete each story in
columns 3-4, draft missing stories as NEW rows, compute percentages, and write both gap-analysis.md and
gap-analysis.csv under docs/gap-analysis/<slug>/. Do not create or change anything in Jira or Confluence.
