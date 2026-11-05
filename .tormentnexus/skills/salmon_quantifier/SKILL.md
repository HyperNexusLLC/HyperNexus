---
name: salmon-quantifier
description: Salmon pseudo-alignment skill for fast and accurate transcript quantification
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\salmon-quantifier\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.680462
tags:
  - 
---



# Salmon Quantifier Skill

## Purpose
Enable Salmon pseudo-alignment for fast and accurate transcript quantification.

## Capabilities
- Selective alignment mode
- GC bias correction
- Mapping rate assessment
- Bootstrap uncertainty estimation
- Multi-mapping resolution
- Decoy-aware indexing

## Usage Guidelines
- Build decoy-aware indices for accuracy
- Enable GC bias correction
- Use selective alignment for improved accuracy
- Generate bootstraps for uncertainty estimation
- Validate mapping rates against expectations
- Document index and parameter versions

## Dependencies
- Salmon
- kallisto
- RSEM

## Process Integration
- RNA-seq Differential Expression Analysis (rnaseq-differential-expression)
- Single-Cell RNA-seq Analysis (scrnaseq-analysis)
