---
name: cog-meeting-processing
description: Process meeting recordings and transcripts into decisions, action items, and team dynamics
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\cog-second-brain\skills\meeting-processing\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.290407

---



# COG Meeting Processing Skill

Process meeting recordings and transcripts into structured outputs: decisions, action items, team dynamics analysis, and executive summaries.

## Capabilities

- Parse meeting transcripts and identify speakers
- Extract decisions with context, rationale, and stakeholders
- Identify action items with owners, priorities, and deadlines
- Analyze team dynamics: engagement, alignment, collaboration quality
- Generate executive meeting summaries
- Segment transcripts into topics and discussion threads
- Route meeting artifacts to vault with project cross-references

## Tool Use Instructions

1. Use `file-read` to load the meeting transcript or recording
2. Parse transcript and identify speakers against participant list
3. Segment into topics and discussion threads
4. Extract decisions with context and rationale
5. Extract action items with owners and deadlines
6. Analyze team dynamics (engagement, alignment, disagreements)
7. Use `file-write` to create meeting notes in 03-professional
8. Use `file-search` to find related projects for cross-referencing
9. Use `git-commit` to commit meeting artifacts

## Examples

```json
{
  "vaultPath": "./cog-vault",
  "captureType": "meeting-transcript",
  "transcriptPath": "./meeting-2026-03-02.txt",
  "meetingTitle": "Sprint Planning Q1 W9",
  "participants": ["Alex", "Jordan", "Sam"]
}
```
