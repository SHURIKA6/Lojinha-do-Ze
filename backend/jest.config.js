export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
  verbose: true,
};
