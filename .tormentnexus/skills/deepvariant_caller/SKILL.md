---
name: deepvariant-caller
description: DeepVariant deep learning variant calling skill for high-accuracy SNV and indel detection
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\deepvariant-caller\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.572422
tags:
  - 
---



# DeepVariant Caller Skill

## Purpose
Enable DeepVariant deep learning variant calling for high-accuracy SNV and indel detection.

## Capabilities
- GPU-accelerated variant calling
- WGS/WES/PacBio mode selection
- Model customization and retraining
- Confidence calibration
- Multi-sample variant calling
- Docker/Singularity deployment

## Usage Guidelines
- Select appropriate model for sequencing type
- Use GPU acceleration when available
- Validate accuracy against benchmark datasets
- Consider container deployment for reproducibility
- Document model version and parameters
- Compare with traditional callers for validation

## Dependencies
- DeepVariant
- Parabricks

## Process Integration
- Whole Genome Sequencing Pipeline (wgs-analysis-pipeline)
- Long-Read Sequencing Analysis (long-read-analysis)
- Analysis Pipeline Validation (pipeline-validation)
