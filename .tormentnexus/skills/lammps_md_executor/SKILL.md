---
name: lammps-md-executor
description: LAMMPS molecular dynamics skill for nanoscale system simulation with force field management
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\lammps-md-executor\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.136348

---



# LAMMPS MD Executor

## Purpose

The LAMMPS MD Executor skill provides molecular dynamics simulation capabilities for nanoscale systems, enabling investigation of structural, mechanical, and thermal properties through classical simulations.

## Capabilities

- Force field selection and parameterization
- System equilibration protocols
- NVT/NPT ensemble simulations
- Trajectory analysis
- Thermal conductivity calculation
- Mechanical property simulation

## Usage Guidelines

### MD Simulation Workflow

1. **System Setup**
   - Build initial configuration
   - Assign force field
   - Minimize energy

2. **Equilibration**
   - NVT temperature equilibration
   - NPT for density
   - Monitor equilibration metrics

3. **Production**
   - Run appropriate ensemble
   - Calculate properties on-the-fly
   - Save trajectories

## Process Integration

- Molecular Dynamics Simulation Workflow
- Multiscale Modeling Integration

## Input Schema

```json
{
  "structure_file": "string",
  "force_field": "string (ReaxFF|MEAM|Tersoff|LJ)",
  "ensemble": "nvt|npt|nve",
  "temperature": "number (K)",
  "pressure": "number (atm, for npt)",
  "timestep": "number (fs)",
  "total_time": "number (ns)"
}
```

## Output Schema

```json
{
  "thermodynamic_properties": {
    "temperature": "number (K)",
    "pressure": "number (atm)",
    "total_energy": "number (eV)",
    "volume": "number (Angstrom^3)"
  },
  "structural_properties": {
    "rdf_file": "string",
    "msd_file": "string"
  },
  "trajectory_file": "string",
  "equilibrated": "boolean"
}
```
