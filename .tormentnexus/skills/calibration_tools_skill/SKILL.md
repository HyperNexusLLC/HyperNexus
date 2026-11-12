---
name: Calibration Tools Skill
description: Sensor and robot calibration using specialized robotics calibration tools
source: ~\.a5c\process-library\babysitter-repo\library\specializations\robotics-simulation\skills\calibration-tools\SKILL.md
category: process-library
date: 2026-06-14T07:33:32.741513

---



# Calibration Tools Skill

## Overview

Expert skill for sensor and robot calibration using specialized tools including Kalibr, camera_calibration, and hand-eye calibration packages.

## Capabilities

- Configure Kalibr for camera-IMU calibration
- Set up camera_calibration for intrinsic calibration
- Implement robot_calibration for kinematic calibration
- Configure hand-eye calibration (eye-in-hand, eye-to-hand)
- Set up LiDAR-camera extrinsic calibration
- Implement IMU bias estimation
- Configure wheel odometry calibration
- Set up multi-camera calibration
- Implement joint encoder calibration
- Generate calibration reports and validation

## Target Processes

- robot-calibration.js
- sensor-fusion-framework.js
- visual-slam-implementation.js
- lidar-mapping-localization.js

## Dependencies

- Kalibr
- camera_calibration
- robot_calibration
- easy_handeye

## Usage Context

This skill is invoked when processes require precise sensor calibration, robot kinematic calibration, or multi-sensor extrinsic calibration.

## Output Artifacts

- Camera calibration YAML files
- IMU calibration parameters
- Hand-eye transformation matrices
- Kinematic calibration results
- Calibration validation reports
- Multi-sensor extrinsic configurations
