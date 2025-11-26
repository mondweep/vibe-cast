import React from 'react';
import './FlightStatusCard.css';

const FlightStatusCard = ({ flight }) => {
    const getStatusClass = (status) => {
        switch (status.toLowerCase()) {
            case 'on time':
                return 'status-green';
            case 'cancelled':
            case 'delayed':
                return 'status-red'; // Or amber for minor delays, but keeping simple for now
            default:
                return 'status-amber';
        }
    };

    return (
        <div className="flight-card">
            <div className={`status-indicator ${getStatusClass(flight.status)}`}></div>
            <div className="flight-info">
                <div className="flight-header">
                    <span className="flight-number">{flight.number}</span>
                    <span className="flight-time">{flight.departureTime}</span>
                </div>
                <div className="flight-dest">{flight.destination}</div>
                <div className="flight-status">{flight.status}</div>
            </div>
        </div>
    );
};

export default FlightStatusCard;
