import { render, screen } from '@testing-library/react';
import FlightStatusCard from './FlightStatusCard';

describe('FlightStatusCard', () => {
    test('renders flight details correctly', () => {
        const flight = {
            number: 'BA123',
            destination: 'New York (JFK)',
            status: 'On Time',
            departureTime: '10:00'
        };

        render(<FlightStatusCard flight={flight} />);

        expect(screen.getByText('BA123')).toBeInTheDocument();
        expect(screen.getByText('New York (JFK)')).toBeInTheDocument();
        expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    test('displays green indicator for On Time flight', () => {
        const flight = {
            number: 'BA123',
            destination: 'JFK',
            status: 'On Time',
            departureTime: '10:00'
        };

        const { container } = render(<FlightStatusCard flight={flight} />);
        // Assuming we use a class or style for color
        const indicator = container.querySelector('.status-indicator');
        expect(indicator).toHaveClass('status-green');
    });

    test('displays red indicator for Cancelled flight', () => {
        const flight = {
            number: 'BA999',
            destination: 'LHR',
            status: 'Cancelled',
            departureTime: '12:00'
        };

        const { container } = render(<FlightStatusCard flight={flight} />);
        const indicator = container.querySelector('.status-indicator');
        expect(indicator).toHaveClass('status-red');
    });
});
