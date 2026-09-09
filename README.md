# Navier-Stokes Learning Platform

An interactive educational platform for learning Navier-Stokes equations through animated scrollytelling, interactive simulations, and assessments.

## Architecture Overview

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + React Context API
- **Internationalization**: react-i18next (English, Spanish, Mandarin)
- **Styling**: CSS with CSS variables and Flexbox/Grid

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: Google Cloud Firestore
- **Authentication**: Firebase Authentication (Google OAuth)
- **Deployment**: Google Cloud Run

### Key Technologies
- REST API with Express
- Firebase ID token authentication
- TypeScript for type safety
- Jest + React Testing Library
- Three.js + D3.js for visualization (planned)
- Rust WASM solver (planned)

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Development Setup

```bash
# Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev  # http://localhost:5173

# Backend (in another terminal)
cd backend
npm install --legacy-peer-deps
npm run dev  # http://localhost:3000
```

### Building

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## Project Structure

```
vibe-cast/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── store/        # Zustand stores
│   │   ├── i18n/         # Internationalization
│   │   └── styles/       # CSS styling
│   ├── Dockerfile
│   └── vite.config.ts
│
├── backend/               # Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Middleware
│   │   └── types/        # TypeScript types
│   ├── Dockerfile
│   └── tsconfig.json
│
├── DEPLOYMENT.md          # Deployment guide
└── README.md
```

## API Endpoints

- `POST /api/sessions` - Create learning session
- `GET /api/sessions/:userId` - Get session data
- `PUT /api/sessions/:userId/progress` - Update progress
- `GET /health` - Health check

## Features

- 9 Progressive Modules (0-8) on Navier-Stokes equations
- Google OAuth authentication
- Learning progress tracking
- Internationalization (EN, ES, ZH)
- Responsive design
- TypeScript type safety

## Module Topics

0. Why Should You Care?
1. Fluids as Continuous Mediums
2. Forces & Acceleration
3. Pressure: The Dominant Force
4. Viscosity & Friction
5. The Complete Equation
6. Numerical Simulation
7. Interactive Solvers
8. Advanced Applications

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Google Cloud deployment instructions.

## Code Quality

- **Formatting**: Prettier (2-space indent)
- **Linting**: ESLint with TypeScript
- **Types**: Strict TypeScript mode
- **Testing**: Jest + React Testing Library

## License

MIT
