import type { Flight, UserProfile, ConciergeMessage } from '../types';

// Create dates relative to "now" for the demo
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

// Flight departing in 4 hours
const departureTime1 = new Date(today.getTime() + 16 * 60 * 60 * 1000); // 4pm today
const arrivalTime1 = new Date(departureTime1.getTime() + 8 * 60 * 60 * 1000);

// Flight departing tomorrow morning
const tomorrowMorning = new Date(today.getTime() + 32 * 60 * 60 * 1000); // 8am tomorrow
const arrivalTime2 = new Date(tomorrowMorning.getTime() + 2 * 60 * 60 * 1000);

export const mockFlights: Flight[] = [
  {
    id: 'flight-1',
    flightNumber: 'BA117',
    airline: 'British Airways',
    origin: {
      code: 'LHR',
      name: 'Heathrow Airport',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
    },
    destination: {
      code: 'JFK',
      name: 'John F. Kennedy International',
      city: 'New York',
      country: 'United States',
      timezone: 'America/New_York',
    },
    scheduledDeparture: departureTime1,
    actualDeparture: new Date(departureTime1.getTime() + 15 * 60 * 1000), // 15 min delay
    scheduledArrival: arrivalTime1,
    actualArrival: null,
    terminal: '5',
    gate: 'A12',
    aircraft: 'Boeing 777-300ER',
    status: 'scheduled',
  },
  {
    id: 'flight-2',
    flightNumber: 'EZY8901',
    airline: 'easyJet',
    origin: {
      code: 'LGW',
      name: 'Gatwick Airport',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
    },
    destination: {
      code: 'BCN',
      name: 'Barcelona-El Prat',
      city: 'Barcelona',
      country: 'Spain',
      timezone: 'Europe/Madrid',
    },
    scheduledDeparture: tomorrowMorning,
    actualDeparture: tomorrowMorning,
    scheduledArrival: arrivalTime2,
    actualArrival: null,
    terminal: 'North',
    gate: '52',
    aircraft: 'Airbus A320neo',
    status: 'scheduled',
  },
];

export const mockUser: UserProfile = {
  name: 'Sarah',
  homeLocation: {
    latitude: 51.5074,
    longitude: -0.1278,
    address: 'Westminster, London SW1A 1AA',
  },
};

export const mockConciergeMessages: ConciergeMessage[] = [
  {
    id: 'msg-1',
    type: 'greeting',
    title: 'Your journey today',
    message: `Good afternoon, ${mockUser.name}. Your flight BA117 to New York departs at 16:00. Traffic to Heathrow is moderate.`,
    timestamp: new Date(),
    status: 'GREEN',
  },
  {
    id: 'msg-2',
    type: 'update',
    title: 'Minor Delay',
    message: 'Your flight BA117 is now expected to depart at 16:15. Gate A12 is confirmed.',
    timestamp: new Date(now.getTime() - 30 * 60 * 1000),
    status: 'AMBER',
  },
  {
    id: 'msg-3',
    type: 'suggestion',
    title: 'Lounge Access Available',
    message: 'The Galleries Lounge is 5 minutes from your gate. Your Priority Pass grants complimentary access.',
    timestamp: new Date(now.getTime() - 60 * 60 * 1000),
    status: 'GREEN',
  },
];

export const mockDepartureFactors = {
  travelTime: 55, // Minutes to Heathrow from Westminster
  securityWaitTime: 25,
  walkingTime: 12,
  bufferTime: 60,
};

// Aircraft position for live tracking (mock)
export const mockAircraftPosition = {
  latitude: 52.3676,
  longitude: 4.9041,
  altitude: 35000,
  speed: 520,
  heading: 270,
  origin: 'AMS',
  flightNumber: 'BA435',
  status: 'In transit from Amsterdam',
};
