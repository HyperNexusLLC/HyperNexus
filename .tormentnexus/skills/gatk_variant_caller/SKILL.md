---
name: gatk-variant-caller
description: GATK best practices skill for germline and somatic variant calling with joint genotyping
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\gatk-variant-caller\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.595744
tags:
  - 
---



# GATK Variant Caller Skill

## Purpose
Provide GATK best practices for germline and somatic variant calling with joint genotyping support.

## Capabilities
- HaplotypeCaller execution
- Base quality score recalibration (BQSR)
- Variant quality score recalibration (VQSR)
- Joint genotyping across cohorts
- GVCF generation and management
- Mutect2 somatic calling

## Usage Guidelines
- Follow GATK best practices workflow
- Apply BQSR for improved accuracy
- Use VQSR for quality filtering when sample count permits
- Generate GVCFs for scalable joint calling
- Select Mutect2 for somatic variants
- Document resource bundles and versions

## Dependencies
- GATK4
- Picard

## Process Integration
- Whole Genome Sequencing Pipeline (wgs-analysis-pipeline)
- Clinical Variant Interpretation (clinical-variant-interpretation)
- Tumor Molecular Profiling (tumor-molecular-profiling)
- Rare Disease Diagnostic Pipeline (rare-disease-diagnostics)
