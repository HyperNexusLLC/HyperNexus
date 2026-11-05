---
name: CDC Pattern Implementer
description: Implements Change Data Capture patterns for real-time data integration
source: ~\.a5c\process-library\babysitter-repo\library\specializations\data-engineering-analytics\skills\cdc-pattern-implementer\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.831953

---



# CDC Pattern Implementer

## Overview

Implements Change Data Capture patterns for real-time data integration. This skill provides expertise in CDC configuration and implementation across various database and streaming platforms.

## Capabilities

- Debezium connector configuration
- CDC pattern selection (log-based, trigger-based, timestamp-based)
- Initial snapshot strategy
- Schema change handling
- Exactly-once delivery configuration
- Sink connector setup
- Tombstone handling
- CDC monitoring setup

## Input Schema

```json
{
  "sourceDatabase": {
    "type": "postgres|mysql|oracle|sqlserver",
    "connection": "object"
  },
  "tables": ["string"],
  "targetSystem": "kafka|kinesis|pubsub",
  "requirements": {
    "latencyMs": "number",
    "exactlyOnce": "boolean"
  }
}
```

## Output Schema

```json
{
  "connectorConfig": "object",
  "snapshotStrategy": "object",
  "schemaConfig": "object",
  "monitoringConfig": "object",
  "documentation": "string"
}
```

## Target Processes

- ETL/ELT Pipeline
- Streaming Pipeline
- Data Warehouse Setup

## Usage Guidelines

1. Identify source database and tables for CDC
2. Define target streaming system
3. Specify latency and delivery guarantees
4. Configure appropriate snapshot strategy for initial load

## Best Practices

- Use log-based CDC when possible for minimal source impact
- Plan initial snapshot strategy carefully for large tables
- Implement proper error handling and dead letter queues
- Monitor replication lag and connector health
- Test schema evolution handling before production
