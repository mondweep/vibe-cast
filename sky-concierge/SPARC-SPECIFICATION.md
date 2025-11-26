# SkyConcierge - SPARC Specification

## S - Specification

### Overview
SkyConcierge is a premium travel concierge application that provides door-to-door journey management with real-time updates, proactive problem-solving, and AI-driven logistics.

### Core Demo Features
1. **Smart Departure Alarm** - Calculate optimal leave time based on traffic + security + walking
2. **Live Flight Tracking** - Real-time aircraft position and status
3. **Disruption Management** - Proactive delay notifications with rebooking options
4. **Concierge Dashboard** - Conversational card-based interface

### User Stories (Demo Scope)
- As a traveller, I want to see my personalised journey timeline
- As a traveller, I want real-time flight status with colour-coded alerts
- As a traveller, I want proactive notifications about delays

### Success Criteria
- Responsive UI that works on mobile and desktop
- Real-time updates simulation (mock data)
- Traffic light colour coding (Green/Amber/Red)
- Conversational "Concierge" interface

---

## P - Pseudocode

### Smart Departure Algorithm
```
FUNCTION calculateDepartureTime(flight, userLocation):
    flightDeparture = flight.departureTime
    bufferTime = 60 minutes (recommended early arrival)

    securityWaitTime = getSecurityQueueEstimate(flight.airport, flight.departureTime)
    walkingTime = getWalkingTimeToGate(flight.terminal, flight.gate)
    travelTime = getTrafficEstimate(userLocation, flight.airport)

    optimalLeaveTime = flightDeparture - bufferTime - securityWaitTime - walkingTime - travelTime

    RETURN {
        leaveTime: optimalLeaveTime,
        breakdown: { travelTime, securityWaitTime, walkingTime, bufferTime }
    }
```

### Flight Status Classifier
```
FUNCTION classifyFlightStatus(flight):
    IF flight.cancelled:
        RETURN { status: 'RED', message: 'Flight Cancelled', action: 'REBOOK' }

    delayMinutes = flight.actualDeparture - flight.scheduledDeparture

    IF delayMinutes <= 0:
        RETURN { status: 'GREEN', message: 'On Time' }
    ELSE IF delayMinutes <= 30:
        RETURN { status: 'AMBER', message: 'Minor Delay' }
    ELSE:
        RETURN { status: 'RED', message: 'Significant Delay', action: 'REVIEW' }
```

---

## A - Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: CSS Modules with CSS Variables
- **State Management**: React Context + Hooks
- **Testing**: Jest + React Testing Library
- **Build**: Vite

### Project Structure
```
sky-concierge/
├── src/
│   ├── components/
│   │   ├── ConciergeCard/
│   │   ├── FlightTracker/
│   │   ├── DepartureAlarm/
│   │   ├── DisruptionAlert/
│   │   └── StatusBadge/
│   ├── hooks/
│   │   ├── useFlightData.ts
│   │   └── useDepartureCalculation.ts
│   ├── services/
│   │   ├── flightService.ts
│   │   └── trafficService.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── timeCalculations.ts
│   │   └── statusClassifier.ts
│   ├── data/
│   │   └── mockFlights.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── timeCalculations.test.ts
│   ├── statusClassifier.test.ts
│   └── components/
└── package.json
```

---

## R - Refinement (TDD Approach)

### Test-First Development Order
1. Write tests for `timeCalculations.ts` utility
2. Write tests for `statusClassifier.ts` utility
3. Write component tests for StatusBadge
4. Write component tests for ConciergeCard
5. Implement to pass tests

---

## C - Completion Checklist
- [ ] All utility tests passing
- [ ] All component tests passing
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Demo data realistic
