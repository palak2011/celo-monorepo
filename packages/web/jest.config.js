const defaultConfig = require('../../jest.config.js')

module.exports = {
  ...defaultConfig,
  globals: {
    navigator: true,
    window: true,
  },
  preset: './node_modules/react-native-web/jest-preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest_setup'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transformIgnorePatterns: ['node_modules/(?!react-native|react-navigation|)'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.jsx?$': 'ts-jest',
  },
}
