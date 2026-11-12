---
name: quantum-espresso-executor
description: Quantum ESPRESSO calculation skill for DFT simulations with pseudopotential management
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\quantum-espresso-executor\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.186920

---



# Quantum ESPRESSO Executor

## Purpose

The Quantum ESPRESSO Executor skill provides DFT calculation capabilities using Quantum ESPRESSO for nanomaterial simulations, with specialized support for phonon calculations, reaction pathways, and time-dependent phenomena.

## Capabilities

- PWscf calculations
- Phonon calculations (DFPT)
- NEB reaction pathway modeling
- Time-dependent DFT
- Pseudopotential library management
- Wannier function analysis

## Usage Guidelines

### QE Calculation Workflow

1. **Input Preparation**
   - Generate input files
   - Select pseudopotentials
   - Set k-point grids

2. **Calculation Types**
   - SCF for ground state
   - Phonon for vibrational
   - NEB for barriers

3. **Post-Processing**
   - Extract band structure
   - Calculate Wannier functions
   - Analyze phonon dispersions

## Process Integration

- DFT Calculation Pipeline for Nanomaterials
- Multiscale Modeling Integration

## Input Schema

```json
{
  "structure_file": "string",
  "calculation": "scf|relax|nscf|bands|phonon|neb",
  "ecutwfc": "number (Ry)",
  "ecutrho": "number (Ry)",
  "kpoints": {"grid": [3, 3, 3], "shift": [0, 0, 0]}
}
```

## Output Schema

```json
{
  "total_energy": "number (Ry)",
  "fermi_energy": "number (eV)",
  "forces": [{"atom": "number", "force": []}],
  "phonon_frequencies": ["number (cm-1)"],
  "neb_barrier": "number (eV)",
  "wannier_centers": [{"orbital": "string", "center": []}]
}
```
