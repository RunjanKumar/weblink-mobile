/* eslint-disable */
/**
 * Web / LG webOS bundle.
 *
 * Produces the plain static site that `ares-package` turns into an .ipk. The
 * output must be fully relative (`publicPath: ''`) because webOS serves the app
 * from a file path, not a web root — absolute `/bundle.js` would 404 on the TV.
 *
 * Three things make an RN codebase build here:
 *  1. `react-native` is aliased to `react-native-web`.
 *  2. `.web.*` extensions resolve first, so every `*.web.ts` shim wins over its
 *     native sibling (storage, secure storage, payments).
 *  3. `node_modules` is NOT excluded from babel-loader — RN and its ecosystem
 *     ship untranspiled Flow/JSX that would otherwise fail to parse.
 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Packages that ship untranspiled source and must go through babel.
const transpileModules = [
  'react-native',
  'react-native-web',
  'react-native-vector-icons',
  'react-native-safe-area-context',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-svg',
  'react-native-css-interop',
  'nativewind',
  '@react-native',
  '@react-navigation',
  '@react-native-community',
];

module.exports = (_env, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'index.web.js'),
    output: {
      path: path.resolve(__dirname, 'web-build'),
      filename: isProduction ? 'static/[name].[contenthash:8].js' : 'static/[name].js',
      // Relative — webOS loads index.html off the filesystem.
      publicPath: '',
      clean: true,
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    resolve: {
      // `.web.*` first: this is what swaps in every shim.
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.json',
      ],
      alias: {
        'react-native$': 'react-native-web',
        'react-native': 'react-native-web',
        // Native-only module with no web build; our shim matches its API.
        '@react-native-community/datetimepicker': path.resolve(
          __dirname,
          'src/shims/DateTimePicker.web.tsx',
        ),
        // Matches the `module-resolver` babel alias used by the native build.
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          // React Navigation's `lib/module` builds are marked `"type": "module"`
          // but import siblings without a file extension, which strict ESM
          // forbids. Metro tolerates it; webpack refuses unless told not to.
          test: /\.m?js$/,
          resolve: {fullySpecified: false},
        },
        {
          test: /\.(js|jsx|ts|tsx)$/,
          include: [
            path.resolve(__dirname, 'index.web.js'),
            path.resolve(__dirname, 'App.tsx'),
            path.resolve(__dirname, 'src'),
            ...transpileModules.map(m => path.resolve(__dirname, 'node_modules', m)),
          ],
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              // Same preset chain as babel.config.js (so web and native agree on
              // JSX/NativeWind/Flow handling) plus preset-env, because webOS
              // ships an older Chromium than Hermes and cannot parse `?.` / `??`.
              configFile: false,
              babelrc: false,
              // The dependency tree mixes ESM (`lib/module`) with CommonJS
              // (react-native-css-interop's `dist`). Babel defaults to treating
              // everything as ESM, which makes webpack mark the CJS files as
              // harmony modules and `exports` blows up at runtime. Detect per file.
              sourceType: 'unambiguous',
              presets: [
                ['@babel/preset-env', {targets: {chrome: '68'}, bugfixes: true}],
                [
                  'module:@react-native/babel-preset',
                  {
                    jsxImportSource: 'nativewind',
                    // Metro wants CommonJS; webpack must keep ESM or packages
                    // shipping `lib/module` builds (React Navigation) get
                    // rewritten to `exports.x = ...` inside a module webpack
                    // already parsed as ESM -> "exports is not defined".
                    disableImportExportTransform: true,
                  },
                ],
                'nativewind/babel',
              ],
              plugins: [
                [
                  'module-resolver',
                  {
                    root: ['./src'],
                    alias: {'@': './src'},
                    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js', '.jsx', '.json'],
                  },
                ],
                [
                  'module:react-native-dotenv',
                  {
                    moduleName: '@env',
                    path: '.env',
                    safe: false,
                    allowUndefined: true,
                  },
                ],
                // Must stay last, exactly as in babel.config.js. Nothing imports
                // reanimated on web today — Skeleton used to, and its module init
                // does not complete in this bundle (makeMutable ends up
                // unassigned) — but leaving the transform out is what makes that
                // failure mode silent, so keep the two configs in agreement.
                'react-native-reanimated/plugin',
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          // react-native-vector-icons ships .ttf; on web they load as font files.
          test: /\.(ttf|otf|woff2?|png|jpe?g|gif|svg)$/,
          type: 'asset/resource',
          generator: {filename: 'static/[name].[hash:8][ext]'},
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'web/index.html'),
        inject: 'body',
      }),
      new (require('webpack').DefinePlugin)({
        // react-native's source branches on these.
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      }),
    ],
    devServer: {
      static: {directory: path.resolve(__dirname, 'web-build')},
      port: 8082,
      historyApiFallback: true,
      hot: true,
    },
    performance: {hints: false},
  };
};
