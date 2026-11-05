---
name: material-balance-calculator
description: Material and energy balance calculation skill for process design and troubleshooting
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\material-balance-calculator\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.959847

---



# Material Balance Calculator Skill

## Purpose

The Material Balance Calculator Skill performs material and energy balance calculations for process design, optimization, and troubleshooting applications.

## Capabilities

- Steady-state material balances
- Component balances
- Energy balances
- Recycle stream calculations
- Purge stream optimization
- Data reconciliation
- Gross error detection
- Balance closure verification
- Heat integration calculations

## Usage Guidelines

### When to Use
- Developing process designs
- Troubleshooting processes
- Optimizing operations
- Reconciling plant data

### Prerequisites
- Stream compositions known
- Flow rates measured/estimated
- Reaction stoichiometry defined
- Physical properties available

### Best Practices
- Close balances properly
- Identify measurement errors
- Document assumptions
- Validate against plant data

## Process Integration

This skill integrates with:
- Process Flow Diagram Development
- Process Simulation Model Development
- Performance Testing and Validation

## Configuration

```yaml
material-balance-calculator:
  balance-types:
    - overall
    - component
    - element
  methods:
    - sequential-modular
    - equation-oriented
    - data-reconciliation
```

## Output Artifacts

- Material balance tables
- Energy balance tables
- Stream summaries
- Reconciliation reports
- Heat duty calculations
