module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Type errors are already caught by `tsc -b` in the build step;
          // isolatedModules keeps Jest fast and avoids per-file TS Program
          // quirks (e.g. ambient *.css module declarations not being
          // discovered without a real tsconfig "include").
          isolatedModules: true,
          target: 'es2023',
          lib: ['ES2023', 'DOM'],
          module: 'commonjs',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          strict: true,
          skipLibCheck: true,
          types: ['jest', '@testing-library/jest-dom'],
        },
      },
    ],
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.(spec|test).ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/src/__mocks__/styleMock.js',
  },
};
