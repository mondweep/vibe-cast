# SkyConcierge

A premium travel concierge application providing door-to-door journey management with real-time updates, proactive problem-solving, and AI-driven logistics.

## Features

### Smart Departure Alarm (F-01)
Calculate optimal departure time based on:
- Current traffic conditions
- Security queue estimates
- Walking time to gate
- Recommended buffer time

### Live Flight Tracking (F-04)
- Real-time aircraft position
- Incoming aircraft status
- Gate and terminal information

### Disruption Management (F-05)
- Automatic delay/cancellation detection
- One-tap rebooking options
- Alternative flight suggestions

### Concierge Dashboard
- Personalised greeting and updates
- Card-based conversational interface
- Traffic light status system (Green/Amber/Red)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: CSS Modules with CSS Variables
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

## Development Methodology

Built using **SPARC** methodology:
- **S**pecification - Defined requirements and user stories
- **P**seudocode - Algorithmic planning
- **A**rchitecture - Component structure design
- **R**efinement - TDD approach
- **C**ompletion - Full implementation

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

\`\`\`bash
cd sky-concierge
npm install
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing

\`\`\`bash
npm run test
\`\`\`

### Build

\`\`\`bash
npm run build
\`\`\`

## Project Structure

\`\`\`
sky-concierge/
├── src/
│   ├── components/
│   │   ├── ConciergeCard/     # Message cards
│   │   ├── FlightTracker/     # Flight status display
│   │   ├── DepartureAlarm/    # Smart departure calculator
│   │   ├── DisruptionAlert/   # Disruption handling
│   │   └── StatusBadge/       # Traffic light badges
│   ├── utils/
│   │   ├── timeCalculations.ts
│   │   └── statusClassifier.ts
│   ├── data/
│   │   └── mockFlights.ts     # Demo data
│   ├── types/
│   │   └── index.ts           # TypeScript definitions
│   ├── App.tsx
│   └── App.css
├── SPARC-SPECIFICATION.md
└── package.json
\`\`\`

## Demo Modes

The application includes four view modes accessible via the navigation:

1. **Dashboard** - Overview with concierge messages and flight summary
2. **Departure** - Smart departure alarm with timeline
3. **Tracking** - Detailed flight tracking
4. **Disruption** - Demo of disruption handling and rebooking

## British English

This application uses British English spellings throughout:
- colour (not color)
- cancelled (not canceled)
- organised (not organized)

## Licence

MIT
