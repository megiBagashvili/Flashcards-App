/**
 * @file backend/jest.config.js
 * @description Configuration file for the Jest testing framework.
 * Specifies how Jest should discover and run tests for the backend project,
 * particularly configuring it to work with TypeScript using ts-jest.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      },
    ],
  },
  testMatch: [
    '**/src/**/*.test.ts',
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/dist/" 
  ],
};
