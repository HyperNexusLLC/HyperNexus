---
name: survey-platform
description: Integrate with survey platforms to create, distribute, and analyze user surveys
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ux-ui-design\skills\survey-platform\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.697774

---



# Survey Platform Skill

## Purpose

Integrate with survey platforms to create surveys, collect responses, and calculate standardized usability metrics like SUS, NPS, and CSAT.

## Capabilities

- Create and distribute surveys
- Collect and aggregate responses
- Calculate SUS (System Usability Scale) scores
- Calculate NPS (Net Promoter Score)
- Calculate CSAT (Customer Satisfaction) scores
- Export results and visualizations
- Generate survey reports

## Target Processes

- user-research.js (quantitativeDataCollectionTask)
- persona-development.js
- usability-testing.js

## Integration Points

- Typeform API
- SurveyMonkey API
- Google Forms API
- Custom survey JSON format

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "platform": {
      "type": "string",
      "enum": ["typeform", "surveymonkey", "google-forms", "custom"]
    },
    "action": {
      "type": "string",
      "enum": ["create", "distribute", "collect", "analyze"]
    },
    "surveyType": {
      "type": "string",
      "enum": ["sus", "nps", "csat", "custom"]
    },
    "surveyConfig": {
      "type": "object",
      "description": "Survey configuration for creation"
    },
    "responsesPath": {
      "type": "string",
      "description": "Path to responses data"
    },
    "targetAudience": {
      "type": "object",
      "description": "Distribution targeting criteria"
    }
  },
  "required": ["platform", "action"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "surveyId": {
      "type": "string",
      "description": "Created survey identifier"
    },
    "surveyUrl": {
      "type": "string",
      "description": "Survey distribution URL"
    },
    "responseCount": {
      "type": "number",
      "description": "Number of responses collected"
    },
    "scores": {
      "type": "object",
      "properties": {
        "sus": { "type": "number" },
        "nps": { "type": "number" },
        "csat": { "type": "number" }
      }
    },
    "analysis": {
      "type": "object",
      "description": "Statistical analysis of responses"
    },
    "reportPath": {
      "type": "string",
      "description": "Path to generated report"
    }
  }
}
```

## Usage Example

```javascript
const result = await skill.execute({
  platform: 'typeform',
  action: 'analyze',
  surveyType: 'sus',
  responsesPath: './survey-responses.json'
});
```
