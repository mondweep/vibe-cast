# ADR-001: PWA Architecture for Assam AI Governance

## Status
Accepted

## Context
The Assam State Government requires two interconnected AI governance systems:
1. Property Registration Digitalization App
2. Infrastructure Cost Auditing System

Both need to be accessible on web and mobile, work in low-connectivity areas of Assam, and comply with Indian IT Act regulations. The PRD specifies React frontend with responsive design and real-time status updates.

## Decision
We will build a Progressive Web App (PWA) using:
- **React 18** with TypeScript for type safety
- **Vite** as build tool for fast development
- **vite-plugin-pwa** for service worker and offline support
- **React Router** for SPA navigation
- **Domain-Driven Design** with two bounded contexts: PropertyRegistration and CostAuditing
- **CSS Modules** for scoped, accessible styling
- **Chart.js** for data visualization (cost analysis dashboards)

## Consequences
- PWA enables offline access for rural Assam users with limited connectivity
- DDD separation keeps the two systems loosely coupled
- React + TypeScript provides compile-time safety for government-grade reliability
- Vite provides fast HMR during development
- No heavy UI framework dependency - keeping bundle size minimal for mobile users
