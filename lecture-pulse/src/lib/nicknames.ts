const adjectives: string[] = [
  "Swift",
  "Brave",
  "Calm",
  "Bright",
  "Cool",
  "Daring",
  "Eager",
  "Fierce",
  "Gentle",
  "Happy",
  "Jolly",
  "Keen",
  "Lucky",
  "Mighty",
  "Noble",
  "Plucky",
  "Quick",
  "Steady",
  "Vivid",
  "Warm",
];

const animals: string[] = [
  "Falcon",
  "Panda",
  "Tiger",
  "Dolphin",
  "Otter",
  "Eagle",
  "Lynx",
  "Raven",
  "Fox",
  "Wolf",
  "Hawk",
  "Koala",
  "Jaguar",
  "Penguin",
  "Cobra",
  "Heron",
  "Bison",
  "Gecko",
  "Crane",
  "Stag",
];

/**
 * Generate a random anonymous nickname.
 * Format: "Adjective Animal" (e.g. "Swift Falcon").
 */
export function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}
