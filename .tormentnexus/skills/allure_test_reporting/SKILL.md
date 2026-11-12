---
name: Allure Test Reporting
description: Allure test reporting framework for comprehensive test result visualization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\qa-testing-automation\skills\allure-reporting\SKILL.md
category: process-library
date: 2026-06-14T07:33:32.638027

---



# Allure Test Reporting Skill

## Overview

This skill provides expert-level capabilities for Allure-based test reporting, enabling rich test result visualization, trend analysis, and stakeholder reporting.

## Capabilities

### Reporter Configuration
- Configure Allure reporter for multiple frameworks
- Jest, Mocha, pytest, JUnit integration
- Playwright and Cypress integration

### Report Generation
- Generate Allure test reports
- Combine results from multiple test runs
- Generate execution timeline

### Test Documentation
- Add test steps and descriptions
- Attach screenshots and logs
- Add parameters and links
- Configure severity and priority

### Categories & Environment
- Configure test categories
- Set up environment information
- Custom category definitions

### Trend Analysis
- Analyze test trends and history
- Track pass/fail rates over time
- Identify flaky tests

### Integration
- Configure Allure TestOps integration
- CI/CD pipeline integration
- Custom widgets and dashboards

## Target Processes

- `automation-framework.js` - Framework reporting setup
- `metrics-dashboard.js` - Test metrics visualization
- `continuous-testing.js` - CI/CD reporting
- `quality-gates.js` - Quality reporting

## Dependencies

- `allure-commandline` - Allure CLI
- Framework-specific adapters
- Allure TestOps (optional)

## Usage Example

```javascript
{
  kind: 'skill',
  skill: {
    name: 'allure-reporting',
    context: {
      action: 'generate-report',
      resultsDir: 'allure-results',
      outputDir: 'allure-report',
      historyDir: 'allure-history',
      cleanFirst: true
    }
  }
}
```

## Configuration

The skill integrates with various test frameworks and provides unified reporting across test types.
