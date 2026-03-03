const path = require('path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: [
    '<rootDir>',
  ],
  moduleNameMapper: {
    '^@inventory/core$': path.resolve(__dirname, '../../packages/core/dist/index.js'),
    '^@inventory/db$': path.resolve(__dirname, '../../packages/db'),
  },
};
