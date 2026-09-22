module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-google-mobile-ads|@react-native-async-storage)',
  ],
};
