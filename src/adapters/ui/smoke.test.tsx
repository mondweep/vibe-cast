import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Line, LineChart, XAxis } from 'recharts';
import '@testing-library/jest-dom/vitest';

describe('smoke', () => {
  it('renders recharts in jsdom', () => {
    const data = [
      { date: '2026-07-25', v: 1 },
      { date: '2026-07-26', v: null },
      { date: '2026-07-27', v: 3 },
    ];
    render(
      <div data-testid="wrap">
        <LineChart width={400} height={200} data={data}>
          <XAxis dataKey="date" />
          <Line dataKey="v" isAnimationActive={false} />
        </LineChart>
      </div>,
    );
    expect(screen.getByTestId('wrap').querySelectorAll('.recharts-line').length).toBe(1);
    expect(screen.getByText('2026-07-25')).toBeInTheDocument();
  });
});
