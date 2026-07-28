import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulletinLoader } from './bulletin-loader';
import { degradedProvenance, failedProvenance, inmatesProvenance } from './test-fixtures';
import type { BulletinLoaderState, SectionConfidenceViewModel } from './view-models';
import type {
  ExtractionConfidence,
  SectionKind,
} from '../../domain/shared/flood-situation-report';

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

  it('keeps the link available once a bulletin is loaded', () => {
    // The moment an officer most needs the newest bulletin is when they are
    // looking at an old one.
    render(<BulletinLoader state={loadedState} onLoad={vi.fn()} />);

    expect(sourceLink().getAttribute('href')).toBe(SDRF_URL);
  });

  it('stays inside the header in compact mode, carrying nothing that will not fit', () => {
    // Measured in the running console at 1366x768: the compact loader rendered
    // 156px tall inside a 44px (2.75rem) header. Its own button was clipped off
    // the top of the viewport at y=-57 and the status line spilled over the
    // content below. The header can hold the file picker and nothing else.
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} compact />);

    expect(screen.getByRole('button', { name: /choose bulletin pdf/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /SDRF Assam/i })).toBeNull();
    expect(screen.queryByText(/only from India/i)).toBeNull();
  });

  it('does not claim no bulletin is loaded while one is on screen', () => {
    // In the header this sat beside a title reading "Assam Flood Report as on
    // 2026-07-27" and contradicted it. The console is never empty — it opens on
    // the bundled example — so "idle" means the officer has not loaded one of
    // their own, which is not the same statement and must not be made here.
    render(<BulletinLoader state={{ status: 'idle' }} onLoad={vi.fn()} compact />);

    expect(screen.queryByText(/no bulletin loaded/i)).toBeNull();
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

describe('BulletinLoader — extraction confidence stays out of the way when clean', () => {
  // Measured on a 412x915 phone: the always-expanded 23-row list stood 1313px
  // tall and pushed the Trend chart to y=1860 in a 1649px document — past the
  // end of the scroll. Reported by a user who could not reach the chart.
  // Real SectionKind values: the 23-section DRIMS catalogue is what the panel
  // renders in production, and a synthetic string would not typecheck against
  // the published language.
  const CATALOGUE: readonly SectionKind[] = [
    'rivers-above-danger-level', 'districts-affected', 'revenue-circles-affected',
    'villages-affected', 'population-and-crop-area-submerged', 'relief-camps-opened',
    'inmates-in-relief-camps', 'non-camp-inmates', 'lives-lost-confirmed',
    'lives-lost-missing', 'animals-affected', 'animals-washed-away', 'houses-damaged',
    'houses-damaged-others', 'rescue-operation', 'relief-distributed',
    'relief-distributed-others', 'infrastructure-road', 'infrastructure-bridge',
    'infrastructure-embankment-breached', 'infrastructure-embankment-affected',
    'infrastructure-others', 'remarks',
  ];

  const sectionsAll = (confidence: ExtractionConfidence): SectionConfidenceViewModel[] =>
    CATALOGUE.map((section, i) => ({
      section,
      sectionLabel: `Section ${i}`,
      confidence: i === 0 ? confidence : 'high',
      sourcePages: [1],
    }));

  const loadedWith = (sections: SectionConfidenceViewModel[]): BulletinLoaderState => ({
    status: 'loaded',
    fileName: 'b.pdf',
    reportDate: '2026-07-26',
    sections,
    reconciliationWarnings: [],
  });

  const disclosure = () =>
    document.querySelector('.section-confidence__disclosure') as HTMLDetailsElement;

  it('collapses to one line when every section read cleanly', () => {
    render(<BulletinLoader state={loadedWith(sectionsAll('high'))} onLoad={vi.fn()} />);

    expect(disclosure().open).toBe(false);
    expect(screen.getByText(/All 23 sections read at high confidence/i)).toBeTruthy();
  });

  it('stays open when a section is degraded — that changes whether figures can be trusted', () => {
    render(<BulletinLoader state={loadedWith(sectionsAll('degraded'))} onLoad={vi.fn()} />);

    expect(disclosure().open).toBe(true);
  });

  it('stays open when a section could not be read at all', () => {
    render(<BulletinLoader state={loadedWith(sectionsAll('failed'))} onLoad={vi.fn()} />);

    expect(disclosure().open).toBe(true);
  });

  it('keeps every section reachable even while collapsed, for screen readers and find-in-page', () => {
    render(<BulletinLoader state={loadedWith(sectionsAll('high'))} onLoad={vi.fn()} />);

    // <details> keeps its contents in the DOM; collapsing hides them visually
    // without removing the record of what was read.
    expect(document.querySelectorAll('.section-confidence__row')).toHaveLength(23);
  });
});
