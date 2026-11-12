---
name: singularity-container-manager
description: Singularity container management skill for HPC-compatible containerized execution
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\singularity-container-manager\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.693596
tags:
  - 
---



# Singularity Container Manager Skill

## Purpose
Provide Singularity container management for HPC-compatible containerized execution.

## Capabilities
- Container building from recipes
- Registry pull and caching
- Bind mount configuration
- GPU passthrough
- MPI integration
- Security compliance for HPC

## Usage Guidelines
- Build containers from definition files
- Cache containers for repeated use
- Configure bind mounts appropriately
- Enable GPU for accelerated workloads
- Integrate with MPI for parallel computing
- Ensure HPC security compliance

## Dependencies
- Singularity/Apptainer
- Docker
- BioContainers

## Process Integration
- Reproducible Research Workflow (reproducible-research)
- All analysis pipelines
