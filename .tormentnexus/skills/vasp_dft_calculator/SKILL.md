---
name: vasp-dft-calculator
description: VASP DFT calculation skill for electronic structure, band structures, and materials property predictions
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\physics\skills\vasp-dft-calculator\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.412057
tags:
  - 
---



# VASP DFT Calculator Skill

## Purpose
Provide comprehensive integration with VASP for density functional theory calculations, electronic structure analysis, and materials property predictions.

## Capabilities
- INCAR/POSCAR/POTCAR generation
- k-point mesh optimization
- Self-consistent field convergence management
- Band structure and DOS calculation
- Geometry optimization workflows
- Phonon calculation setup (with Phonopy)

## Usage Guidelines
- Select appropriate exchange-correlation functionals
- Converge k-point mesh and energy cutoff systematically
- Use appropriate smearing methods for metals vs insulators
- Document pseudopotential versions for reproducibility

## Dependencies
- VASP
- VASPKIT
- Phonopy
- pymatgen

## Process Integration
- Density Functional Theory Calculations
- Material Synthesis and Characterization
- Phase Transition Investigation
