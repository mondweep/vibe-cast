import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PropertyRegistrationList } from '../ApplicationList';

describe('PropertyRegistrationList', () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <PropertyRegistrationList />
      </MemoryRouter>
    );

  it('should_render_heading_when_component_mounts', () => {
    renderComponent();
    expect(screen.getByText('Property Registration')).toBeInTheDocument();
  });

  it('should_render_applications_table_when_data_exists', () => {
    renderComponent();
    expect(screen.getByRole('table', { name: /property registration applications/i })).toBeInTheDocument();
  });

  it('should_display_application_numbers_when_applications_loaded', () => {
    renderComponent();
    expect(screen.getByText('ASM-PR-2026-00142')).toBeInTheDocument();
    expect(screen.getByText('ASM-PR-2026-00143')).toBeInTheDocument();
    expect(screen.getByText('ASM-PR-2026-00144')).toBeInTheDocument();
  });

  it('should_show_new_application_link_when_page_renders', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /new application/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/property/new');
  });

  it('should_display_status_badges_when_applications_loaded', () => {
    renderComponent();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getAllByText('Under Review').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Registered').length).toBeGreaterThanOrEqual(1);
  });

  it('should_show_summary_counts_when_component_renders', () => {
    renderComponent();
    // Total count
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});
