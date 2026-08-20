/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots:['<rootDir>/src'], // prevent jest from searching outside src/
  setupFiles: ['./jest.setup.js'],
  modulePathIgnorePatterns:['<rootDir>/dist'], // prevents jest from running compiled .js files in dist/ alongside .ts source files
  coveragePathIgnorePatterns:['/node_modules/','<rootDir>/src/generated/'], // excludes generated prisma client files from code coverage metrics
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          ignoreDeprecations: '6.0',
        },
      },
    ],
  },
};
