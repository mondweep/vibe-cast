# Feature Specification: Neural Classification Layer (ruv-FANN)

**Feature Branch**: `neural-fann`
**Created**: 2026-03-17
**Status**: Draft

## Overview

ruv-FANN is a multi-component Rust neural network framework. The full ecosystem includes:

- **ruv-FANN Core** — Pure Rust neural network engine (feedforward, cascade correlation)
- **Neuro-Divergent** — 27+ forecasting models (LSTM, N-BEATS, Transformers) with 2-4x performance gains
- **ruv-swarm** — Distributed swarm intelligence for multi-agent coordination

For genomic_one, the primary integration points are the core neural network engine and the forecasting models.

## User Scenarios & Testing

### User Story 1 - Variant Pathogenicity Classification (Priority: P1)

The system uses a trained ruv-FANN neural network to classify detected variants as benign, likely benign, uncertain, likely pathogenic, or pathogenic — based on k-mer context vectors from RuVector.

**Why this priority**: Variant classification is the highest-value output for life sciences users. Automated classification with confidence scoring accelerates drug target identification.

**Independent Test**: Run pipeline with known pathogenic variant (HBB sickle cell), neural classifier returns "pathogenic" with high confidence.

**Acceptance Scenarios**:
1. **Given** a variant is detected by the pipeline, **When** classification is requested, **Then** the ruv-FANN model returns a 5-class prediction with confidence scores
2. **Given** a batch of variants is detected, **When** batch classification runs, **Then** all variants are classified in < 500ms total
3. **Given** new labeled variant data is available, **When** retraining is triggered, **Then** the model updates incrementally using RProp

### User Story 2 - Gene Expression Forecasting (Priority: P2)

Using Neuro-Divergent forecasting models, predict future gene expression patterns based on epigenetic methylation time series — useful for drug response prediction.

**Why this priority**: Drug makers need to predict how gene expression will respond to interventions over time.

**Acceptance Scenarios**:
1. **Given** a methylation time series is loaded, **When** forecast is requested, **Then** the system returns predicted methylation levels for the next N timepoints with confidence intervals
2. **Given** multiple forecasting models are available, **When** the system runs prediction, **Then** it selects the best-performing model for the data characteristics

### User Story 3 - Pharmacogenomic Interaction Scoring (Priority: P2)

A neural network scores drug-gene interactions by learning weights from known pharmacogenomic relationships (CYP2D6, etc.), going beyond the rule-based star allele system.

**Acceptance Scenarios**:
1. **Given** a patient's genotype is analyzed, **When** drug interaction scoring runs, **Then** a learned neural score supplements the rule-based recommendation
2. **Given** the score diverges from rule-based output, **When** the divergence exceeds threshold, **Then** the system flags it for human review

### User Story 4 - Cascade Network Topology Growth (Priority: P3)

ruv-FANN's cascade correlation feature dynamically grows network topology during training — adding neurons only when needed. This is valuable for discovering the minimum network complexity required for genomic classification tasks.

**Acceptance Scenarios**:
1. **Given** a classification task is defined, **When** cascade training runs, **Then** the network starts minimal and adds hidden neurons until convergence
2. **Given** cascade training completes, **When** results are displayed, **Then** the final topology (layer sizes, connection count) is shown alongside accuracy

### Edge Cases
- What if training data is insufficient (< 50 samples)? Warn user, fall back to rule-based classification.
- What if a model file is corrupted? Retrain from scratch using stored training data.
- What if RProp diverges? Fall back to standard backpropagation.

## Requirements

### Functional Requirements
- **FR-001**: System MUST add `ruv-fann` as a Cargo dependency with features: `parallel`, `serde`
- **FR-002**: System MUST implement a variant classifier using feedforward network (input: k-mer vector, output: 5-class pathogenicity)
- **FR-003**: System MUST serialize/deserialize trained models via serde for persistence
- **FR-004**: System MUST support incremental retraining without full dataset reload
- **FR-005**: System MUST expose `/api/brain/classify` endpoint for variant classification
- **FR-006**: System MUST expose `/api/brain/forecast` endpoint for expression prediction
- **FR-007**: System MUST log training metrics (loss, accuracy, epochs) for display in Brain/Learning tab
- **FR-008**: System SHOULD integrate Neuro-Divergent forecasting models for time-series prediction [NEEDS CLARIFICATION: confirm available models in ruv-FANN crate]

### Key Entities
- **VariantClassifier**: A trained feedforward network (input dims = k-mer vector size, output = 5 classes)
- **ForecastModel**: A time-series prediction model (type, horizon, accuracy, last trained)
- **TrainingRun**: A record of model training (epochs, loss curve, accuracy, duration, algorithm)
- **ClassificationResult**: Prediction output (variant ID, class, confidence per class, model version)

## Success Criteria

### Measurable Outcomes
- **SC-001**: Variant classification inference < 10ms per variant
- **SC-002**: Batch classification of 100 variants < 500ms
- **SC-003**: Model training on 1,000 samples < 30s
- **SC-004**: Classification accuracy >= 85% on benchmark variant dataset
- **SC-005**: Serialized model size < 5MB
