---
name: alarm-rationalization-tool
description: Alarm management skill for alarm rationalization, setpoint optimization, and ISA-18.2 compliance
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\alarm-rationalization-tool\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.897010

---



# Alarm Rationalization Tool Skill

## Purpose

The Alarm Rationalization Tool Skill supports alarm management including alarm rationalization, setpoint optimization, and compliance with ISA-18.2 alarm management standards.

## Capabilities

- Alarm philosophy development
- Alarm rationalization worksheets
- Priority assignment
- Setpoint determination
- Deadband optimization
- Alarm flood analysis
- State-based alarming
- Suppression strategy design
- KPI monitoring

## Usage Guidelines

### When to Use
- Rationalizing existing alarms
- Designing new alarm systems
- Optimizing alarm performance
- Addressing alarm floods

### Prerequisites
- Alarm data available
- Process understanding
- Operating procedures defined
- Risk assessment complete

### Best Practices
- Follow ISA-18.2 lifecycle
- Involve operations
- Document rationalization
- Monitor KPIs continuously

## Process Integration

This skill integrates with:
- Alarm Rationalization
- Control Strategy Development
- Safety Instrumented System Design

## Configuration

```yaml
alarm-rationalization-tool:
  standards:
    - ISA-18.2
    - EEMUA-191
  priority-levels:
    - critical
    - high
    - medium
    - low
  kpis:
    - alarms-per-hour
    - chattering-alarms
    - stale-alarms
```

## Output Artifacts

- Rationalization worksheets
- Alarm philosophy
- Priority matrices
- KPI reports
- Improvement recommendations
