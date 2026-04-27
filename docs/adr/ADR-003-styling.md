# ADR-003: Styling System — Tailwind CSS + shadcn/ui

**Status:** Accepted  
**Date:** 2026-04-27  
**Linear:** MON-47

## Context

The course platform requires a consistent, accessible, and maintainable UI component system with an AWS-flavoured dark-mode aesthetic.

## Decision

**Use Tailwind CSS utility classes with shadcn/ui component primitives (Radix UI foundation).**

## Rationale

- Tailwind: zero runtime CSS, AOT purging, design token system via CSS variables
- shadcn/ui: composable, accessible Radix primitives — no black-box component library
- Components are copied into `/src/components/ui/` — fully owned, fully customisable
- Dark mode via CSS variables aligns with AWS Console aesthetic
- No additional bundle weight from unused component code

## Consequences

- shadcn components require manual updates when upstream changes
- Tailwind class verbosity is managed by component encapsulation
- Custom AWS colour palette defined in `tailwind.config.ts`

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Material UI | Runtime CSS-in-JS overhead; design system conflicts with AWS aesthetic |
| Chakra UI | Similar overhead; less control over primitives |
| Plain CSS modules | More effort, less consistent than utility-first approach |
