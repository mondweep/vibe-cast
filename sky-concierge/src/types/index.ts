// Core Types for SkyConcierge

export type FlightStatus = 'GREEN' | 'AMBER' | 'RED';

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: Date;
  actualDeparture: Date | null;
  scheduledArrival: Date;
  actualArrival: Date | null;
  terminal: string;
  gate: string;
  aircraft: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'in_air' | 'landed' | 'cancelled' | 'delayed';
  baggageBelt?: string;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface JourneyLeg {
  type: 'ground_transport' | 'security' | 'walking' | 'flight' | 'baggage' | 'transfer';
  duration: number; // minutes
  description: string;
  status: FlightStatus;
}

export interface DepartureCalculation {
  leaveTime: Date;
  breakdown: {
    travelTime: number;
    securityWaitTime: number;
    walkingTime: number;
    bufferTime: number;
  };
  totalMinutes: number;
}

export interface StatusClassification {
  status: FlightStatus;
  message: string;
  action?: 'REBOOK' | 'REVIEW' | 'NONE';
  delayMinutes?: number;
}

export interface ConciergeMessage {
  id: string;
  type: 'greeting' | 'update' | 'alert' | 'suggestion';
  title: string;
  message: string;
  timestamp: Date;
  status: FlightStatus;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UserProfile {
  name: string;
  homeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  icon: string;
}
