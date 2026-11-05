---
name: structural-variant-detector
description: Structural variant detection skill for identifying CNVs, inversions, translocations, and complex rearrangements
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\structural-variant-detector\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.710787
tags:
  - 
---



# Structural Variant Detector Skill

## Purpose
Enable structural variant detection for identifying CNVs, inversions, translocations, and complex rearrangements.

## Capabilities
- Split-read and paired-end SV calling
- Copy number variation detection
- Mobile element insertion detection
- Complex SV resolution
- SV annotation and visualization
- Multi-caller integration

## Usage Guidelines
- Use multiple callers for comprehensive detection
- Integrate results from different algorithms
- Validate SVs with independent methods
- Annotate SVs with functional impact
- Visualize SVs for manual review
- Document caller combinations and filters

## Dependencies
- Manta
- DELLY
- CNVkit
- LUMPY
- GRIDSS

## Process Integration
- Whole Genome Sequencing Pipeline (wgs-analysis-pipeline)
- Tumor Molecular Profiling (tumor-molecular-profiling)
- Long-Read Sequencing Analysis (long-read-analysis)
