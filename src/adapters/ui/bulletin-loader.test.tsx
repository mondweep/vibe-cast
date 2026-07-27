import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinLoader } from './bulletin-loader';
import { degradedProvenance, failedProvenance, inmatesProvenance } from './test-fixtures';
import type { BulletinLoaderState } from './view-models';

afterEach(cleanup);

const pdf = () =>
  new File(['%PDF-1.7'], 'Daily_Flood_Report_20260727.pdf', { type: 'application/pdf' });

const loadedState: BulletinLoaderState = {
  status: 'loaded',
  fileName: 'Daily_Flood_Report_20260727.pdf',
  reportDate: '2026-07-27',
  sections: [inmatesProvenance, degradedProvenance, failedProvenance],
  reconciliationWarnings: [
    {
      sectionLabel: 'Animals Affected',
      column: 'Big Animals',
      statedTotal: 256334,
      computedTotal: 256004,
    },
  ],
};

describe('BulletinLoader — taking the file', () => {
  it('hands a picked file to the injected loader', async () => {
    const onLoad = vi.fn();
    const user = userEvent.setup();
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={onLoad} />);

    const file = pdf();
    await user.upload(screen.getByLabelText('Bulletin PDF'), file);

    expect(onLoad).toHaveBeenCalledWith(file);
  });

  it('hands a dropped file to the injected loader', () => {
    const onLoad = vi.fn();
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={onLoad} />);

    const file = pdf();
    fireEvent.drop(screen.getByTestId('bulletin-dropzone'), {
      dataTransfer: { files: [file], items: [], types: ['Files'] },
    });

    expect(onLoad).toHaveBeenCalledWith(file);
  });

  it('does not call the loader when a drop carries no file', () => {
    const onLoad = vi.fn();
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={onLoad} />);

    fireEvent.drop(screen.getByTestId('bulletin-dropzone'), {
      dataTransfer: { files: [], items: [], types: [] },
    });

    expect(onLoad).not.toHaveBeenCalled();
  });

  it('marks the drop target while a file is over it', () => {
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);
    const dropzone = screen.getByTestId('bulletin-dropzone');

    fireEvent.dragOver(dropzone, { dataTransfer: { types: ['Files'] } });
    expect(dropzone.getAttribute('data-dragging')).toBe('true');

    fireEvent.dragLeave(dropzone);
    expect(dropzone.getAttribute('data-dragging')).toBe('false');
  });
});

describe('BulletinLoader — states', () => {
  it('reports idle, parsing and loaded through a live region', () => {
    const { rerender } = render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('No bulletin loaded');

    rerender(
      <BulletinLoader
        state={{ status: 'parsing', fileName: 'Daily_Flood_Report_20260727.pdf' }}
        onLoad={vi.fn()}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Reading Daily_Flood_Report_20260727.pdf',
    );

    rerender(<BulletinLoader state={loadedState} onLoad={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain(
      'Assam Flood Report as on 2026-07-27',
    );
  });

  it('raises a specific, non-generic message when the PDF is not a DRIMS bulletin', () => {
    render(
      <BulletinLoader
        state={{
          status: 'error',
          message:
            'Not a DRIMS Assam flood bulletin: no "Assam Flood Report as on" heading found.',
          fileName: 'holiday-photos.pdf',
        }}
        onLoad={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Not a DRIMS Assam flood bulletin');
    expect(alert.textContent).toContain('holiday-photos.pdf');
  });
});

describe('BulletinLoader — confidence and reconciliation (FR-1.8)', () => {
  it('puts reconciliation warnings above the section list, with both totals', () => {
    const { container } = render(<BulletinLoader state={loadedState} onLoad={vi.fn()} />);

    const warning = screen.getByText(/1 reconciliation warning/).closest('section');
    expect(warning?.textContent).toContain('256,334');
    expect(warning?.textContent).toContain('256,004');
    expect(warning?.textContent).toContain('330');
    expect(warning?.textContent).toMatch(/kept, not discarded/);

    const panels = Array.from(container.querySelectorAll('section'));
    const warningIndex = panels.indexOf(warning as HTMLElement);
    const confidenceIndex = panels.indexOf(
      screen.getByText('Extraction confidence by section').closest('section') as HTMLElement,
    );
    expect(warningIndex).toBeLessThan(confidenceIndex);
  });

  it('states extraction confidence per section in words', () => {
    render(<BulletinLoader state={loadedState} onLoad={vi.fn()} />);

    expect(screen.getByText('3 sections · 1 degraded · 1 could not be read')).toBeTruthy();
    expect(screen.getAllByText('High confidence').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Degraded — reconciliation failed/).length).toBeGreaterThan(0);
    expect(screen.getByText(/never rendered as zero/)).toBeTruthy();
  });
});

describe('BulletinLoader — where to get a bulletin', () => {
  const SDRF_URL = 'https://sdrf.assam.gov.in/dfr/download?type=flood';

  const sourceLink = () =>
    screen.getByRole('link', { name: /Download the latest bulletin from SDRF Assam/i });

  it('offers a link to the SDRF Assam download, so the officer knows where to get one', () => {
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);

    expect(sourceLink().getAttribute('href')).toBe(SDRF_URL);
  });

  it('opens it in a new tab without leaking the referrer', () => {
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);

    expect(sourceLink().getAttribute('target')).toBe('_blank');
    expect(sourceLink().getAttribute('rel')).toBe('noreferrer');
  });

  it('warns that the SDRF site is reachable only from India', () => {
    // Without this, someone outside India clicks, gets a connection reset, and
    // reasonably concludes the console is broken.
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);

    expect(screen.getByText(/only from India/i)).toBeTruthy();
  });

  it('keeps the link available once a bulletin is loaded, and in the compact header', () => {
    // The moment an officer most needs the newest bulletin is when they are
    // looking at an old one.
    render(<BulletinLoader state={loadedState} onLoad={vi.fn()} compact />);

    expect(sourceLink().getAttribute('href')).toBe(SDRF_URL);
    // The header has 2.75rem to work in (NFR-11), so the note is trimmed — but
    // the geo-restriction is never the part that gets dropped.
    expect(screen.getByText('Reachable only from India.')).toBeTruthy();
    expect(screen.queryByText(/India VPN/)).toBeNull();
  });

  it('never fetches it — the app makes no request of its own (NFR-5)', () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
    try {
      render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} />);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});
