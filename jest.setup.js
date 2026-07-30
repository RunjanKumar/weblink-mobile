/* eslint-disable no-undef */
// Silence/ mock native modules that have no JS implementation in the test env.

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlocked'},
}));

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: (k, v) => store.set(k, v),
      getString: k => store.get(k),
      getBoolean: k => store.get(k),
      getNumber: k => store.get(k),
      delete: k => store.delete(k),
      clearAll: () => store.clear(),
      contains: k => store.has(k),
    })),
  };
});

// `virtual: true` is required: `@env` is not a real package on disk — babel's
// react-native-dotenv plugin synthesises it at BUILD time from .env, so jest
// cannot resolve it and refuses the mock without this flag.
jest.mock(
  '@env',
  () => ({
    API_BASE_URL: 'https://example.test',
    SOCKET_URL: 'https://socket.example.test',
    API_TIMEOUT: '20000',
    APP_ENV: 'test',
  }),
  {virtual: true},
);
