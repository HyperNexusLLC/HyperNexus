---
name: Stream Processing Windowing Designer
description: Designs optimal windowing strategies for stream processing
source: ~\.a5c\process-library\babysitter-repo\library\specializations\data-engineering-analytics\skills\stream-processing-windowing-designer\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.895817

---



# Stream Processing Windowing Designer

## Overview

Designs optimal windowing strategies for stream processing. This skill provides expertise in window types, watermarks, and trigger strategies for streaming applications.

## Capabilities

- Window type selection (tumbling, sliding, session, global)
- Watermark strategy design
- Late data handling
- Trigger configuration
- Window aggregation optimization
- State management recommendations
- Exactly-once semantics configuration

## Input Schema

```json
{
  "useCase": "string",
  "eventTimeField": "string",
  "latencyRequirements": {
    "maxLatencyMs": "number",
    "allowedLateMs": "number"
  },
  "aggregations": ["object"]
}
```

## Output Schema

```json
{
  "windowConfig": {
    "type": "string",
    "size": "string",
    "slide": "string"
  },
  "watermarkConfig": "object",
  "triggerConfig": "object",
  "lateDataHandling": "object"
}
```

## Target Processes

- Streaming Pipeline
- Feature Store Setup

## Usage Guidelines

1. Define use case and event time field
2. Specify latency requirements
3. List aggregation operations needed
4. Consider late data arrival patterns

## Best Practices

- Choose window type based on business requirements
- Configure watermarks based on expected lateness
- Use appropriate triggers for latency vs completeness tradeoff
- Plan state management for long windows
- Test with realistic event time distributions
