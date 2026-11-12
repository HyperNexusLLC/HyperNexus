---
name: metaphlan-profiler
description: MetaPhlAn metagenomic profiling skill for species-level community composition
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\metaphlan-profiler\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.644801
tags:
  - 
---



# MetaPhlAn Profiler Skill

## Purpose
Enable MetaPhlAn metagenomic profiling for species-level community composition.

## Capabilities
- Clade-specific marker gene analysis
- Species-level quantification
- Strain-level profiling (StrainPhlAn)
- Unknown species estimation
- Multi-sample heatmaps
- Comparative analysis

## Usage Guidelines
- Use latest marker database
- Profile at species level for most analyses
- Apply strain-level analysis when relevant
- Visualize community composition
- Compare across samples and conditions
- Document database versions

## Dependencies
- MetaPhlAn4
- StrainPhlAn
- mOTUs

## Process Integration
- Shotgun Metagenomics Pipeline (shotgun-metagenomics)
