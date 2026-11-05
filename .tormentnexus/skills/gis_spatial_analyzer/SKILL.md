---
name: gis-spatial-analyzer
description: GIS spatial analysis skill for watershed delineation, floodplain mapping, and site analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\gis-spatial-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.120669

---



# GIS Spatial Analyzer Skill

## Purpose

The GIS Spatial Analyzer Skill performs spatial analysis including watershed delineation, floodplain mapping, buffer analysis, and land use classification.

## Capabilities

- Watershed delineation
- Floodplain mapping
- Buffer analysis
- Slope analysis
- Land use classification
- Right-of-way analysis
- Viewshed analysis
- Proximity analysis

## Usage Guidelines

### When to Use
- Analyzing site constraints
- Delineating watersheds
- Mapping flood zones
- Evaluating land use

### Prerequisites
- GIS data available
- DEM for terrain analysis
- Boundary data defined
- Analysis criteria established

### Best Practices
- Use appropriate resolution
- Verify data sources
- Document methodology
- Validate results

## Process Integration

This skill integrates with:
- Flood Analysis and Mitigation
- Stormwater Management Design
- Highway Geometric Design

## Configuration

```yaml
gis-spatial-analyzer:
  analysis-types:
    - watershed
    - flood
    - buffer
    - slope
    - land-use
  data-sources:
    - DEM
    - parcel
    - FEMA
    - NLCD
```

## Output Artifacts

- Watershed maps
- Floodplain delineations
- Buffer zones
- Analysis reports
