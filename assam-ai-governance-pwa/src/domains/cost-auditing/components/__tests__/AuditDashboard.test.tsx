import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CostAuditingDashboard } from '../AuditDashboard';

describe('CostAuditingDashboard', () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <CostAuditingDashboard />
      </MemoryRouter>
    );

  it('should_render_heading_when_component_mounts', () => {
    renderComponent();
    expect(screen.getByText('Infrastructure Cost Auditing')).toBeInTheDocument();
  });

  it('should_render_estimates_table_when_data_exists', () => {
    renderComponent();
    expect(screen.getByRole('table', { name: /cost estimates for review/i })).toBeInTheDocument();
  });

  it('should_display_project_names_when_estimates_loaded', () => {
    renderComponent();
    expect(screen.getByText('NH-37 Jorhat-Golaghat Road Widening')).toBeInTheDocument();
    expect(screen.getByText('Silchar Municipal Road Resurfacing')).toBeInTheDocument();
    expect(screen.getByText('Tezpur-Bhalukpong Highway Extension')).toBeInTheDocument();
  });

  it('should_show_risk_level_badges_when_estimates_loaded', () => {
    renderComponent();
    const greenBadges = screen.getAllByText('Green');
    const yellowBadges = screen.getAllByText('Yellow');
    const redBadges = screen.getAllByText('Red');
    expect(greenBadges.length).toBeGreaterThan(0);
    expect(yellowBadges.length).toBeGreaterThan(0);
    expect(redBadges.length).toBeGreaterThan(0);
  });

  it('should_display_risk_filter_when_page_renders', () => {
    renderComponent();
    expect(screen.getByLabelText(/filter by risk/i)).toBeInTheDocument();
  });

  it('should_show_submit_estimate_link_when_page_renders', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /submit estimate/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auditing/new');
  });

  it('should_render_historical_projects_section_when_page_loads', () => {
    renderComponent();
    expect(screen.getByText('Historical Cost Reference (Baseline Data)')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /historical road project costs/i })).toBeInTheDocument();
  });
});
