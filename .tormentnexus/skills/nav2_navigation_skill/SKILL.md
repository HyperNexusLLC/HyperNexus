---
name: Nav2 Navigation Skill
description: Specialized skill for ROS2 Nav2 navigation stack configuration and behavior trees
source: ~\.a5c\process-library\babysitter-repo\library\specializations\robotics-simulation\skills\nav2-navigation\SKILL.md
category: process-library
date: 2026-06-14T07:33:32.790413

---



# Nav2 Navigation Skill

## Overview

Expert skill for configuring and customizing the ROS2 Nav2 navigation stack, including behavior trees, costmaps, planners, and controllers.

## Capabilities

- Configure Nav2 navigation stack with all plugins
- Create behavior trees for navigation logic
- Set up costmap layers (static, obstacle, inflation, voxel)
- Configure planners (NavFn, Smac, ThetaStar)
- Set up controllers (DWB, Regulated Pure Pursuit, MPPI)
- Implement recovery behaviors (spin, backup, wait)
- Configure waypoint following and route planning
- Set up navigation server lifecycle management
- Implement custom BT nodes and plugins
- Debug navigation failures and path planning issues

## Target Processes

- nav2-navigation-setup.js
- path-planning-algorithm.js
- dynamic-obstacle-avoidance.js
- autonomous-exploration.js

## Dependencies

- Nav2 (Navigation2)
- BehaviorTree.CPP
- navigation2 plugins
- costmap_2d

## Usage Context

This skill is invoked when processes require mobile robot navigation setup, costmap configuration, path planning, or behavior tree design for autonomous navigation.

## Output Artifacts

- Nav2 parameter files (YAML)
- Behavior tree XML files
- Costmap configuration
- Planner and controller parameters
- Recovery behavior configurations
- Custom BT node implementations
