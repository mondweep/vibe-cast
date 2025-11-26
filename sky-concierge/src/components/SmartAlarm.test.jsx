import { render, screen } from '@testing-library/react';
import SmartAlarm from './SmartAlarm';

describe('SmartAlarm', () => {
    test('renders leave time', () => {
        render(<SmartAlarm leaveTime="14:30" trafficStatus="Heavy" />);
        expect(screen.getByText('Leave by 14:30')).toBeInTheDocument();
    });

    test('shows traffic warning', () => {
        render(<SmartAlarm leaveTime="14:30" trafficStatus="Heavy" />);
        // Check if both parts exist
        expect(screen.getByText(/Traffic is/i)).toBeInTheDocument();
        expect(screen.getByText(/Heavy/i)).toBeInTheDocument();
    });
});
