# Feature Specification: Brain — Learning Tab

**Feature Branch**: `brain-learning`
**Created**: 2026-03-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - View Learning State (Priority: P1)

A researcher navigates to `/brain/learning` and sees the current state of the Bayesian learning layer: active priors, confidence distributions, and how the system's beliefs have evolved over time.

**Why this priority**: Transparency into the learning process builds trust and enables researchers to validate or correct the system's reasoning.

**Independent Test**: Navigate to `/brain/learning`, see Bayesian prior distributions visualized as charts, with a timeline of belief updates.

**Acceptance Scenarios**:
1. **Given** the user navigates to `/brain/learning`, **When** the page loads, **Then** current Bayesian priors are displayed as probability distribution charts (one per learned trait)
2. **Given** priors are displayed, **When** user selects a trait (e.g., "variant pathogenicity"), **Then** a timeline shows how the prior evolved with each analysis run
3. **Given** the learning dashboard is loaded, **When** new analysis data is processed, **Then** the prior distributions update in near-real-time

### User Story 2 - Long-Term Pattern Recognition (Priority: P1)

The learning tab displays persistent patterns the system has identified across multiple analyses — recurring variant signatures, pharmacogenomic correlations, and gene interaction patterns that have been reinforced through Bayesian updates.

**Why this priority**: Long-term patterns are the core value proposition of the intelligence system. They represent accumulated knowledge beyond any single analysis.

**Acceptance Scenarios**:
1. **Given** the learning page is loaded, **When** user views "Patterns", **Then** a ranked list shows discovered patterns with confidence scores and evidence counts
2. **Given** a pattern is displayed, **When** user clicks it, **Then** the supporting evidence is shown (which analyses contributed, Bayesian update history)

### User Story 3 - Neural Network Training Status (Priority: P2)

Display the status of ruv-FANN neural network models — training progress, accuracy metrics, and classification performance on variant/pathway tasks.

**Acceptance Scenarios**:
1. **Given** the learning page is loaded, **When** user switches to "Neural Models", **Then** a list of trained models shows architecture, accuracy, loss, and last training date
2. **Given** a model is listed, **When** user clicks "Retrain", **Then** the model retrains on latest data and progress is shown

### User Story 4 - MinCut Pathway Analysis (Priority: P2)

The learning tab includes pathway vulnerability analysis using RuVector's mincut algorithms — showing which gene interactions are critical bottlenecks in disease pathways, informing drug target identification.

**Why this priority**: Drug makers need to identify minimum intervention points in biological networks.

**Acceptance Scenarios**:
1. **Given** the learning page is loaded, **When** user switches to "Pathways", **Then** a gene interaction graph is displayed with mincut edges highlighted
2. **Given** the pathway graph is visible, **When** user selects a disease pathway, **Then** the minimum cut is computed and critical intervention points are highlighted with drug target annotations

### Edge Cases
- What if no Bayesian learning data exists yet? Show initial uniform priors with explanation.
- What if mincut computation exceeds timeout? Show partial results with progress indicator.

## Requirements

### Functional Requirements
- **FR-001**: System MUST store Bayesian priors persistently (serialized to disk or RuVector)
- **FR-002**: System MUST update priors incrementally with each new analysis
- **FR-003**: System MUST visualize prior distributions using Recharts
- **FR-004**: System MUST display learning history as a timeline
- **FR-005**: System MUST expose `/api/brain/learning` endpoint with current Bayesian state
- **FR-006**: System MUST integrate ruv-FANN for neural network training and inference
- **FR-007**: System MUST integrate RuVector mincut for pathway vulnerability analysis
- **FR-008**: System MUST expose `/api/brain/pathways` endpoint for mincut results

### Key Entities
- **BayesianPrior**: A probability distribution over a genomic trait (name, distribution params, update count, confidence)
- **LearnedPattern**: A recurring pattern with evidence chain (pattern type, confidence, evidence count, last updated)
- **NeuralModel**: A trained ruv-FANN model (architecture, accuracy, loss, training date, task)
- **PathwayCut**: A mincut result on a gene interaction graph (cut edges, cut value, partitions, drug target annotations)

## Success Criteria

### Measurable Outcomes
- **SC-001**: Bayesian priors update in < 200ms per analysis
- **SC-002**: Learning timeline renders up to 1,000 update events at 30fps
- **SC-003**: Mincut computation completes in < 2s for graphs up to 500 nodes
- **SC-004**: Neural model training status updates in real-time via SSE/WebSocket
