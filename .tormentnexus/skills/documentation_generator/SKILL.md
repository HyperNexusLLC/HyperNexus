---
name: documentation-generator
description: Generate documentation for migrated systems including API docs, architecture docs, and runbooks
source: ~\.a5c\process-library\babysitter-repo\library\specializations\code-migration-modernization\skills\documentation-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.617421

---



# Documentation Generator Skill

Generates comprehensive documentation for migrated systems including API documentation, architecture diagrams, and operational runbooks.

## Purpose

Enable documentation creation for:
- API documentation generation
- Architecture documentation
- Runbook generation
- Change documentation
- Diagram generation

## Capabilities

### 1. API Documentation Generation
- Generate from OpenAPI specs
- Create interactive docs
- Include examples
- Support versioning

### 2. Architecture Documentation
- Create architecture diagrams
- Document components
- Map dependencies
- Explain patterns

### 3. Runbook Generation
- Create operational procedures
- Document troubleshooting
- Include escalation paths
- Generate playbooks

### 4. Change Documentation
- Document migration changes
- Track before/after
- Note breaking changes
- Generate release notes

### 5. Migration Guide Creation
- Create upgrade guides
- Document migration steps
- Include rollback procedures
- Provide checklists

### 6. Diagram Generation
- Generate architecture diagrams
- Create sequence diagrams
- Build data flow diagrams
- Produce deployment diagrams

## Tool Integrations

| Tool | Purpose | Integration Method |
|------|---------|-------------------|
| Swagger UI | API docs | CLI |
| AsyncAPI | Event docs | CLI |
| PlantUML | Diagrams | CLI |
| Mermaid | Diagrams | Markdown |
| Backstage | Developer portal | Config |
| MkDocs | Documentation site | CLI |

## Output Schema

```json
{
  "generationId": "string",
  "timestamp": "ISO8601",
  "documentation": {
    "api": {
      "path": "string",
      "format": "string"
    },
    "architecture": {
      "path": "string",
      "diagrams": []
    },
    "runbooks": [],
    "guides": []
  },
  "artifacts": {
    "site": "string",
    "pdfs": [],
    "diagrams": []
  }
}
```

## Integration with Migration Processes

- **documentation-migration**: Primary doc generation
- All migration processes (change documentation)

## Related Skills

- `openapi-generator`: API spec generation
- `knowledge-extractor`: Source material

## Related Agents

- `documentation-migration-agent`: Doc orchestration
- `operational-readiness-agent`: Runbook creation
