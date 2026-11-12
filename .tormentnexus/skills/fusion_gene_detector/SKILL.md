---
name: fusion-gene-detector
description: Gene fusion detection skill for oncology applications with multiple caller integration
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\fusion-gene-detector\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.586943
tags:
  - 
---



# Fusion Gene Detector Skill

## Purpose
Enable gene fusion detection for oncology applications with multiple caller integration.

## Capabilities
- RNA-based fusion calling
- DNA-based fusion detection
- Multi-caller consensus
- Visualization of fusion events
- Known fusion annotation
- Clinical actionability assessment

## Usage Guidelines
- Use multiple callers for sensitivity
- Build consensus from different algorithms
- Annotate with known fusion databases
- Visualize fusion breakpoints
- Assess clinical actionability
- Document caller combinations

## Dependencies
- STAR-Fusion
- Arriba
- FusionCatcher

## Process Integration
- Tumor Molecular Profiling (tumor-molecular-profiling)
- RNA-seq Differential Expression Analysis (rnaseq-differential-expression)
