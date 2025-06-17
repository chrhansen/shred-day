module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.*/config$': '<rootDir>/src/lib/__mocks__/config.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@tanstack|other-es-modules)/)',
  ],
  testMatch: [
    '**/src/**/*.test.(ts|tsx|js)'
  ],
  globals: {
    'import.meta': {
      env: {
        DEV: true,
        VITE_API_BASE_URL: ''
      }
    }
  }
};
