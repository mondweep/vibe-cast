# Feature Specification: Brain — Memories Tab

**Feature Branch**: `brain-memories`
**Created**: 2026-03-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - View Stored Memories (Priority: P1)

A researcher navigates to `/brain/memories` and sees a searchable list of vector memories stored in RuVector. Each memory shows the sequence/pattern it represents, when it was stored, similarity scores, and metadata.

**Why this priority**: Memories are the persistent knowledge base of the intelligence system. Users need to see what the system has learned and retained.

**Independent Test**: Navigate to `/brain/memories`, see a list of stored vector entries with metadata. Search filters results in real-time.

**Acceptance Scenarios**:
1. **Given** the user navigates to `/brain/memories`, **When** the page loads, **Then** a paginated list of vector memories is displayed with sequence ID, storage date, and similarity cluster
2. **Given** memories are displayed, **When** user types in the search field, **Then** results filter by sequence name, gene, or metadata tag
3. **Given** a memory entry is visible, **When** user clicks it, **Then** an expanded view shows the full k-mer vector visualization, nearest neighbors, and HNSW graph position

### User Story 2 - Memory Similarity Graph (Priority: P2)

A 2D/3D visualization shows stored memories as nodes, with edges representing similarity above a threshold. Clusters emerge showing related genomic patterns.

**Why this priority**: Visual representation of the vector space helps researchers understand what patterns the system considers similar.

**Acceptance Scenarios**:
1. **Given** the memories page is loaded, **When** user switches to "Graph View", **Then** a force-directed graph renders memories as nodes with similarity edges
2. **Given** the graph is displayed, **When** user adjusts the similarity threshold slider, **Then** edges below the threshold fade out, revealing cluster structure

### User Story 3 - Store New Memory (Priority: P2)

A researcher can manually trigger storing a new sequence analysis result as a persistent vector memory in RuVector.

**Acceptance Scenarios**:
1. **Given** a pipeline analysis has completed, **When** user clicks "Store to Memory", **Then** the k-mer vectors are indexed in RuVector's HNSW and appear in the memories list

### Edge Cases
- What if RuVector is not running? Show cached memories with a "disconnected" indicator.
- What if memory store is empty? Show onboarding prompt to run first analysis.

## Requirements

### Functional Requirements
- **FR-001**: System MUST read vector memories from RuVector via the KmerIndex API
- **FR-002**: System MUST display memory metadata (gene, date, dimensions, cluster ID)
- **FR-003**: System MUST support full-text search across memory metadata
- **FR-004**: System MUST provide a force-directed graph visualization of memory similarity
- **FR-005**: System MUST expose a `/api/brain/memories` endpoint serving stored vectors
- **FR-006**: System MUST support pagination (50 items per page default)

### Key Entities
- **VectorMemory**: A stored k-mer vector with metadata (gene name, timestamp, vector dimensions, HNSW node ID)
- **MemoryCluster**: A group of similar memories identified by HNSW proximity

## Success Criteria

### Measurable Outcomes
- **SC-001**: Memory list loads in < 500ms for up to 1,000 entries
- **SC-002**: Search filters results in < 100ms
- **SC-003**: Graph visualization renders up to 500 nodes at 30fps
- **SC-004**: Vector similarity search returns nearest neighbors in < 50ms
