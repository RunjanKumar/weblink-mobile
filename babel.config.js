module.exports = {
  presets: [
    ['module:@react-native/babel-preset', {jsxImportSource: 'nativewind'}],
    'nativewind/babel',
  ],
  plugins: [
    // Path alias: import from '@/...' instead of long relative paths.
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {'@': './src'},
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // Typed environment variables via `import {API_BASE_URL} from '@env'`.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    // NOTE: react-native-reanimated/plugin MUST be the last plugin.
    'react-native-reanimated/plugin',
  ],
};
