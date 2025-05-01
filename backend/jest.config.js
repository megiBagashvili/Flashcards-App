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
