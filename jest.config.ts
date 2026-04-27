import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/unit/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/tests/unit/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/domains/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/index.ts",
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};

export default createJestConfig(config);
