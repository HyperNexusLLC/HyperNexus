---
name: Object Detection/Segmentation Skill
description: Deep learning based object detection and segmentation for robotics applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\robotics-simulation\skills\object-detection\SKILL.md
category: process-library
date: 2026-06-14T07:33:32.796751

---



# Object Detection/Segmentation Skill

## Overview

Expert skill for deploying and optimizing deep learning models for object detection, instance segmentation, and 3D object detection in robotics applications.

## Capabilities

- Configure YOLO (v5, v8) for real-time detection
- Set up Detectron2 for instance segmentation
- Implement semantic segmentation models
- Configure TensorRT optimization for Jetson
- Set up ONNX runtime deployment
- Implement 3D object detection (PointPillars, VoxelNet)
- Configure depth-based object detection
- Set up ROS vision pipelines with image_pipeline
- Implement object tracking (SORT, DeepSORT, ByteTrack)
- Configure multi-camera detection fusion

## Target Processes

- object-detection-pipeline.js
- synthetic-data-pipeline.js
- nn-model-optimization.js
- moveit-manipulation-planning.js

## Dependencies

- YOLO (Ultralytics)
- Detectron2
- TensorRT
- ONNX Runtime
- vision_msgs

## Usage Context

This skill is invoked when processes require object detection model deployment, instance segmentation, 3D detection, or multi-object tracking for robot perception.

## Output Artifacts

- Detection model configurations
- TensorRT optimized models
- ROS detection node implementations
- Tracking pipeline configurations
- Multi-camera fusion setups
- Inference optimization scripts
