---
name: nextflow-pipeline-executor
description: Nextflow workflow management skill for reproducible bioinformatics pipelines
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\nextflow-pipeline-executor\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.649045
tags:
  - 
---



# Nextflow Pipeline Executor Skill

## Purpose
Provide Nextflow workflow management for reproducible bioinformatics pipelines.

## Capabilities
- DSL2 workflow execution
- Container integration (Docker/Singularity)
- Cloud execution (AWS, GCP, Azure)
- Pipeline parameterization
- Resume and caching
- Execution reports and timelines

## Usage Guidelines
- Use DSL2 for modular pipelines
- Containerize processes for reproducibility
- Configure for target execution environment
- Enable resume for fault tolerance
- Generate execution reports
- Document pipeline versions

## Dependencies
- Nextflow
- nf-core
- Snakemake

## Process Integration
- Reproducible Research Workflow (reproducible-research)
- Analysis Pipeline Validation (pipeline-validation)
- All analysis pipelines
