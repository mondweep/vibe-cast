# Constitution: Genomic One

## Project Principles

### 1. AI-Native Intelligence
Every feature must contribute to a layered intelligence system. Raw data flows through vectorization, neural classification, Bayesian learning, and decision synthesis before reaching the user.

### 2. Life Sciences First
This platform serves life sciences researchers and drug makers. All design decisions prioritize clinical relevance, pharmacogenomic accuracy, and regulatory awareness.

### 3. Rust-Native Performance
Backend computation uses the ruvnet ecosystem (rvdna, RuVector, ruv-FANN, sublinear). No Python/R dependencies for core pipeline. Sub-second response times for all API endpoints.

### 4. Progressive Intelligence
The system learns over time. Bayesian priors update with each analysis. Vector memories persist across sessions. The platform gets smarter with use.

### 5. Privacy and Compliance
Genomic data is sensitive. All processing is local-first. No data leaves the system without explicit user action.

## Governance Constraints

### Testing
- All API endpoints must have integration tests
- Intelligence layers must have accuracy benchmarks
- Frontend components must render without backend (static data fallbacks)

### Performance
- API response < 500ms for all endpoints
- Frontend initial load < 3s
- Vector similarity search < 100ms for 10k sequences

### Quality
- Rust: `cargo clippy` clean, no unsafe blocks
- Frontend: ESLint clean, TypeScript strict mode
- All new features require a spec before implementation

### Security
- No genomic data in logs
- CORS restricted in production
- Input validation on all API endpoints
