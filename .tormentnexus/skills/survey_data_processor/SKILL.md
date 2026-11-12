---
name: survey-data-processor
description: Survey data processing skill for point clouds, DTM generation, and coordinate transformation
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\survey-data-processor\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.206557

---



# Survey Data Processor Skill

## Purpose

The Survey Data Processor Skill processes survey data including point cloud processing, DTM/TIN generation, coordinate transformation, and traverse adjustment.

## Capabilities

- Point cloud processing
- DTM/TIN generation
- Coordinate transformation
- Traverse adjustment
- Level loop adjustment
- GNSS data processing
- Contour generation
- Feature extraction

## Usage Guidelines

### When to Use
- Processing survey data
- Creating terrain models
- Transforming coordinates
- Adjusting measurements

### Prerequisites
- Survey data collected
- Control points established
- Coordinate system defined
- Quality requirements known

### Best Practices
- Check data quality
- Verify transformations
- Document adjustments
- Archive raw data

## Process Integration

This skill integrates with:
- Geotechnical Site Investigation
- Highway Geometric Design

## Configuration

```yaml
survey-data-processor:
  data-types:
    - point-cloud
    - total-station
    - GNSS
    - level
  processing:
    - DTM-generation
    - adjustment
    - transformation
    - feature-extraction
```

## Output Artifacts

- DTM surfaces
- Adjusted coordinates
- Transformation reports
- Survey maps
