module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Allow the `@/` path alias to resolve via babel-plugin-module-resolver.
    'react-native/no-inline-styles': 'warn',
    'no-console': ['warn', {allow: ['warn', 'error']}],
    // Intentional `void promise` (fire-and-forget) is fine.
    'no-void': 'off',
    // Ignore rest-sibling omissions like `const {[id]: _omit, ...rest} = obj`.
    '@typescript-eslint/no-unused-vars': [
      'error',
      {argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true},
    ],
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', '*.config.js'],
};
