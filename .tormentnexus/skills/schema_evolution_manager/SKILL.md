---
name: Schema Evolution Manager
description: Manages schema evolution and compatibility across data systems
source: ~\.a5c\process-library\babysitter-repo\library\specializations\data-engineering-analytics\skills\schema-evolution-manager\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.886988

---



# Schema Evolution Manager

## Overview

Manages schema evolution and compatibility across data systems. This skill ensures safe schema changes that maintain backward and forward compatibility.

## Capabilities

- Schema compatibility checking (Avro, Protobuf, JSON Schema)
- Breaking change detection
- Migration script generation
- Version management
- Schema registry operations
- Backward/forward compatibility validation
- Schema documentation generation
- Cross-system schema synchronization

## Input Schema

```json
{
  "currentSchema": "object",
  "proposedSchema": "object",
  "schemaFormat": "avro|protobuf|jsonschema|ddl",
  "compatibilityMode": "backward|forward|full|none"
}
```

## Output Schema

```json
{
  "compatible": "boolean",
  "breakingChanges": ["object"],
  "migrationScript": "string",
  "recommendations": ["string"],
  "versionInfo": "object"
}
```

## Target Processes

- Streaming Pipeline
- ETL/ELT Pipeline
- Data Catalog
- Pipeline Migration

## Usage Guidelines

1. Provide current and proposed schema definitions
2. Specify schema format for proper parsing
3. Define compatibility mode based on system requirements
4. Review breaking changes before proceeding with migration

## Best Practices

- Always test schema changes in non-production first
- Use schema registry for centralized schema management
- Document schema versions and changes
- Plan migration strategies for breaking changes
- Coordinate schema changes across dependent systems
