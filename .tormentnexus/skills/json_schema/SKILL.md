---
name: json-schema
description: JSON Schema validation and API contract design.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\json-schema\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.848849

---



# JSON Schema Skill

Expert assistance for JSON Schema validation.

## Capabilities

- Write JSON Schemas
- Validate data
- Design API contracts
- Generate documentation
- Handle complex types

## Schema Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "minLength": 1 },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["id", "name", "email"],
  "additionalProperties": false
}
```

## Target Processes

- api-contract-design
- validation-setup
- documentation
