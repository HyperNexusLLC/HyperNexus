---
name: spacy-ner
description: spaCy NER model training and entity extraction for conversational AI
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\spacy-ner\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.014513

---



# spaCy NER Skill

## Capabilities

- Train custom spaCy NER models
- Configure entity extraction pipelines
- Design annotation schemas
- Implement entity linking
- Set up model evaluation
- Deploy efficient NER inference

## Target Processes

- entity-extraction-slot-filling
- chatbot-design-implementation

## Implementation Details

### spaCy Components

1. **NER**: Named Entity Recognition
2. **EntityLinker**: Link to knowledge bases
3. **EntityRuler**: Rule-based matching
4. **SpanCategorizer**: Overlapping entities

### Training Configuration

- config.cfg setup
- Training data format (spaCy v3)
- Augmentation strategies
- Evaluation metrics

### Configuration Options

- Base model selection (en_core_web_*)
- Custom entity types
- Training parameters
- GPU acceleration
- Model packaging

### Best Practices

- Quality annotation data
- Balance entity types
- Use prodigy for annotation
- Regular model evaluation

### Dependencies

- spacy
- spacy-transformers (optional)
