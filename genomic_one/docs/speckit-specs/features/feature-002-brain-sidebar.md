# Feature Specification: Brain Sidebar Navigation

**Feature Branch**: `brain-sidebar`
**Created**: 2026-03-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Navigate Intelligence Layers (Priority: P1)

A researcher opens Genomic One and sees a "Brain" icon in the header. Clicking it reveals a collapsible sidebar with navigation to intelligence-layer pages. On mobile, a hamburger menu toggles the sidebar as an overlay.

**Why this priority**: The Brain sidebar is the entry point to the entire intelligence system. Without it, new intelligence features have no home.

**Independent Test**: Click Brain icon, sidebar opens with navigation links. Click a link, routed to correct page with unique URL. Resize to mobile, hamburger appears and sidebar becomes overlay.

**Acceptance Scenarios**:
1. **Given** the dashboard is loaded, **When** user clicks the Brain icon, **Then** a sidebar slides in from the left with navigation items
2. **Given** the sidebar is open on desktop, **When** user clicks a nav item, **Then** they are routed to `/brain/[section]` with the sidebar remaining visible
3. **Given** the viewport is < 768px, **When** user taps the hamburger icon, **Then** the sidebar opens as a full-height overlay with a close button
4. **Given** the sidebar is open on mobile, **When** user taps outside the sidebar, **Then** it closes

### User Story 2 - Sidebar Collapse State (Priority: P2)

On desktop, the sidebar can be collapsed to an icon-only rail (60px) or expanded (280px). The state persists in localStorage.

**Why this priority**: Screen real estate matters when viewing complex genomic visualizations.

**Independent Test**: Toggle collapse, reload page, sidebar retains state.

**Acceptance Scenarios**:
1. **Given** the sidebar is expanded, **When** user clicks the collapse toggle, **Then** the sidebar animates to icon-only mode
2. **Given** the sidebar is collapsed, **When** user hovers an icon, **Then** a tooltip shows the section name

### Edge Cases
- What happens when navigating directly to `/brain/memories` without opening sidebar? Sidebar should auto-open to that section.
- What if localStorage is unavailable? Default to expanded.

## Requirements

### Functional Requirements
- **FR-001**: System MUST render a Brain icon button in the main header
- **FR-002**: System MUST use HeroUI Sidebar/Drawer components for the collapsible panel
- **FR-003**: System MUST use react-hamburger-menu (or equivalent) for mobile toggle
- **FR-004**: System MUST support Next.js App Router with unique URLs per Brain section (`/brain/memories`, `/brain/learning`, etc.)
- **FR-005**: System MUST animate transitions (sidebar open/close/collapse)

### Key Entities
- **BrainSection**: A navigable section within the Brain sidebar (name, icon, route, component)
- **SidebarState**: collapsed | expanded | hidden (mobile)

## Success Criteria

### Measurable Outcomes
- **SC-001**: Sidebar opens/closes in < 200ms animation
- **SC-002**: All Brain routes are accessible via direct URL
- **SC-003**: Mobile hamburger menu is functional at viewport < 768px
- **SC-004**: Lighthouse accessibility score >= 90 for sidebar navigation
