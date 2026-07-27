import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinReload, SDRF_DOWNLOAD_URL } from './bulletin-reload';

afterEach(cleanup);

const pdf = () => new File(['%PDF-1.4'], 'flood-report.pdf', { type: 'application/pdf' });

describe('BulletinReload', () => {
  it('offers a plainly named way to load a newer Daily Flood Report', () => {
    render(<BulletinReload onLoad={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /Load today’s Daily Flood Report/i }),
    ).toBeTruthy();
  });

  it('hands the chosen file to the injected loader and never touches the network itself', async () => {
    const onLoad = vi.fn();
    const user = userEvent.setup();
    render(<BulletinReload onLoad={onLoad} />);

    const file = pdf();
    await user.upload(screen.getByLabelText(/newer bulletin pdf/i), file);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoad).toHaveBeenCalledWith(file);
  });

  it('does nothing when the picker is dismissed without a file', () => {
    const onLoad = vi.fn();
    render(<BulletinReload onLoad={onLoad} />);

    fireEvent.change(screen.getByLabelText(/newer bulletin pdf/i), { target: { files: [] } });

    expect(onLoad).not.toHaveBeenCalled();
  });

  it('opens the file picker from the button, not from a bare input nobody sees', async () => {
    const user = userEvent.setup();
    render(<BulletinReload onLoad={vi.fn()} />);

    const input = screen.getByLabelText(/newer bulletin pdf/i);
    const click = vi.spyOn(input, 'click');

    await user.click(screen.getByRole('button', { name: /Load today’s Daily Flood Report/i }));

    expect(click).toHaveBeenCalled();
  });

  it('accepts only PDFs, matching what ASDMA publishes', () => {
    render(<BulletinReload onLoad={vi.fn()} />);

    expect(screen.getByLabelText(/newer bulletin pdf/i).getAttribute('accept')).toBe(
      'application/pdf,.pdf',
    );
  });

  it('points at the SDRF Assam direct download', () => {
    render(<BulletinReload onLoad={vi.fn()} />);

    const link = screen.getByRole('link', { name: /SDRF Assam/i });
    expect(link.getAttribute('href')).toBe(SDRF_DOWNLOAD_URL);
    expect(SDRF_DOWNLOAD_URL).toBe('https://sdrf.assam.gov.in/dfr/download?type=flood');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('says the SDRF site is reachable only from India', () => {
    // Without this, a reader abroad clicks, the connection hangs, and they
    // conclude the console is broken rather than that the site is geofenced.
    render(<BulletinReload onLoad={vi.fn()} />);

    expect(screen.getByText(/reachable only from India/i)).toBeTruthy();
  });

  it('says the PDF is read in this browser and never uploaded', () => {
    render(<BulletinReload onLoad={vi.fn()} />);

    expect(screen.getByText(/read in this browser and never uploaded/i)).toBeTruthy();
  });
});
