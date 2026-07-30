module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|@react-navigation|react-native-maps|react-native-screens|react-native-safe-area-context)/)',
  ],
};
