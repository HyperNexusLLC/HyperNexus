---
name: comsol-multiphysics-executor
description: COMSOL Multiphysics skill for continuum-scale nanomaterial and device modeling
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\comsol-multiphysics-executor\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.063306

---



# COMSOL Multiphysics Executor

## Purpose

The COMSOL Multiphysics Executor skill provides continuum-level simulation capabilities for nanomaterial and nanodevice modeling, enabling multi-physics analysis of heat transfer, electromagnetics, fluid dynamics, and coupled phenomena.

## Capabilities

- Heat transfer modeling
- Electromagnetic simulations
- Fluid dynamics at nanoscale
- Structural mechanics
- Chemical transport modeling
- Multi-physics coupling

## Usage Guidelines

### Multiphysics Modeling

1. **Geometry and Meshing**
   - Create or import geometry
   - Define physics-aware mesh
   - Handle multi-scale features

2. **Physics Setup**
   - Select appropriate modules
   - Define boundary conditions
   - Set material properties

3. **Solution and Analysis**
   - Choose solver settings
   - Run parametric studies
   - Post-process results

## Process Integration

- Multiscale Modeling Integration
- Nanodevice Integration Process Flow

## Input Schema

```json
{
  "geometry_file": "string",
  "physics_modules": ["heat_transfer", "electromagnetics", "fluid_flow"],
  "materials": [{"domain": "number", "material": "string"}],
  "boundary_conditions": [{"boundary": "string", "type": "string", "value": "number"}],
  "study_type": "stationary|transient|frequency"
}
```

## Output Schema

```json
{
  "solution_converged": "boolean",
  "field_results": [{
    "field": "string",
    "max": "number",
    "min": "number",
    "average": "number"
  }],
  "derived_quantities": [{
    "name": "string",
    "value": "number",
    "unit": "string"
  }],
  "export_files": ["string"]
}
```
