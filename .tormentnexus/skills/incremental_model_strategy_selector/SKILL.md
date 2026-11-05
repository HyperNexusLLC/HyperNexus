---
name: Incremental Model Strategy Selector
description: Selects and configures optimal incremental model strategies
source: ~\.a5c\process-library\babysitter-repo\library\specializations\data-engineering-analytics\skills\incremental-model-strategy-selector\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.868077

---



# Incremental Model Strategy Selector

## Overview

Selects and configures optimal incremental model strategies. This skill optimizes data transformation efficiency through proper incremental processing patterns.

## Capabilities

- Incremental strategy selection (append, merge, delete+insert)
- Partition pruning optimization
- Unique key configuration
- On_schema_change handling
- Full refresh scheduling
- Lookback window optimization
- Late-arriving data handling

## Input Schema

```json
{
  "modelCharacteristics": {
    "sourceType": "string",
    "updatePattern": "append|update|delete",
    "volumeGB": "number",
    "updateFrequency": "string"
  },
  "platform": "snowflake|bigquery|redshift",
  "existingModel": "object"
}
```

## Output Schema

```json
{
  "strategy": "append|merge|delete+insert",
  "config": "object",
  "partitionStrategy": "object",
  "refreshSchedule": "object",
  "dbtConfig": "object"
}
```

## Target Processes

- Incremental Model Setup
- dbt Model Development
- Pipeline Migration

## Usage Guidelines

1. Analyze source data update patterns
2. Measure data volume and update frequency
3. Select strategy based on characteristics
4. Configure appropriate lookback windows

## Best Practices

- Use append for insert-only sources
- Use merge for sources with updates
- Configure partition pruning for large tables
- Schedule periodic full refreshes for data correction
- Handle late-arriving data with appropriate lookback
