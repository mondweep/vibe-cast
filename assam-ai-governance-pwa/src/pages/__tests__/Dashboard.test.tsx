import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';

describe('Dashboard', () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

  it('should_render_governance_heading_when_page_loads', () => {
    renderComponent();
    expect(screen.getByText('Governance Dashboard')).toBeInTheDocument();
  });

  it('should_show_property_registration_section_when_page_loads', () => {
    renderComponent();
    expect(screen.getByText('Property Registration')).toBeInTheDocument();
  });

  it('should_show_cost_auditing_section_when_page_loads', () => {
    renderComponent();
    expect(screen.getByText('Infrastructure Cost Auditing')).toBeInTheDocument();
  });

  it('should_display_stat_cards_when_data_loaded', () => {
    renderComponent();
    expect(screen.getByText('Total Applications')).toBeInTheDocument();
    expect(screen.getByText('Remote Adoption')).toBeInTheDocument();
    expect(screen.getByText('Fraud Detection Rate')).toBeInTheDocument();
  });

  it('should_show_quick_actions_when_page_renders', () => {
    renderComponent();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('New Property Registration')).toBeInTheDocument();
    expect(screen.getByText('Submit Cost Estimate')).toBeInTheDocument();
  });

  it('should_show_trends_section_when_page_renders', () => {
    renderComponent();
    expect(screen.getByText('6-Month Trends')).toBeInTheDocument();
    expect(screen.getByText('Digital Registrations Growth')).toBeInTheDocument();
  });

  it('should_link_to_property_registration_when_action_clicked', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /new property registration/i });
    expect(link).toHaveAttribute('href', '/property/new');
  });
});
