/* eslint-disable */
/**
 * Web / LG webOS / Samsung Tizen bundle.
 *
 * Produces the plain static site that `ares-package` turns into an .ipk, or —
 * with `--env target=tizen` — that `tizen package` turns into a .wgt. The
 * output must be fully relative (`publicPath: ''`) because both TVs serve the
 * app from a file path, not a web root — absolute `/bundle.js` would 404.
 *
 * The two TV targets share one bundle shape; they differ only in the output
 * folder (so one build never wipes the other) and in index.html, where the
 * Tizen build loads Samsung's `webapis.js`.
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

module.exports = (env = {}, argv = {}) => {
  const isProduction = argv.mode === 'production';
  // `webos` (default — `npm run ipk` and `npm run web` are unchanged) or `tizen`.
  const tvTarget = env.target === 'tizen' ? 'tizen' : 'webos';
  const outputDir = path.resolve(__dirname, tvTarget === 'tizen' ? 'web-build-tizen' : 'web-build');

  return {
    mode: isProduction ? 'production' : 'development',
    // Pin the language level of everything webpack and the minifier EMIT.
    // Plain `web` lets Terser assume ES2020 and rewrite `x == null ? void 0 : x`
    // into `x ?? void 0` AFTER babel has run — invisible in the source, fatal
    // on webOS 5.x/6.x (Chromium 68/79). ES2018 is all Chromium 68 parses.
    target: ['web', 'es2018'],
    entry: path.resolve(__dirname, 'index.web.js'),
    output: {
      path: outputDir,
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
        // Reanimated is DEAD WEIGHT on webOS: 168 modules that fail to
        // initialise here anyway (its `makeMutable` export never gets assigned,
        // which is what used to crash the dashboard). Nothing in src/ imports
        // it — it only enters the graph because gesture-handler does a
        // `require` inside a try/catch. `false` hands webpack an empty module,
        // which is exactly the case that require already handles: it checks for
        // `useSharedValue`, does not find it, and falls back to its own
        // implementation. Less to parse, less to hold in memory on the TV.
        'react-native-reanimated': false,
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
                [
                  '@babel/preset-env',
                  {
                    targets: {chrome: '68'},
                    bugfixes: true,
                    // preset-env only rewrites SYNTAX by default; it does not
                    // add missing built-in METHODS. webOS ships an old Chromium
                    // that lacks plenty of them — React Navigation's StackRouter
                    // calls Array#findLastIndex (Chrome 97), and other deps use
                    // findLast (97) and Object.fromEntries (73). Without these
                    // polyfills the app throws "... is not a function" the first
                    // time such a method is reached. 'entry' expands the single
                    // `core-js/stable` import in index.web.js into exactly the
                    // polyfills the target is missing.
                    useBuiltIns: 'entry',
                    corejs: {version: '3.49', proposals: false},
                  },
                ],
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
                // NOTE: babel.config.js (native) ends with
                // 'react-native-reanimated/plugin'. It is deliberately absent
                // here: reanimated is aliased away entirely for the web build
                // (see resolve.alias), so the worklet transform would have
                // nothing to transform and could only inject imports of a
                // module this bundle no longer contains.
              ],
            },
          },
        },
        {
          // Every OTHER package in node_modules ships compiled-but-modern JS
          // that the rule above never sees. Several (TanStack Query, zod,
          // axios) use `?.`, `??`, class fields and `#private` members —
          // syntax webOS 5.x (Chromium 68) and 6.x (Chromium 79) cannot even
          // parse, so the whole bundle fails and the TV shows a black screen.
          // Lower the SYNTAX only; missing built-in methods already come from
          // the `core-js/stable` entry import.
          test: /\.[cm]?js$/,
          include: path.resolve(__dirname, 'node_modules'),
          exclude: [
            // Already handled, with the full preset chain, by the rule above.
            ...transpileModules.map(m => path.resolve(__dirname, 'node_modules', m)),
            // The polyfills and babel's own helpers must stay untouched, or
            // the helpers end up importing themselves.
            /[\\/]node_modules[\\/]core-js[\\/]/,
            /[\\/]node_modules[\\/]@babel[\\/]runtime[\\/]/,
          ],
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              configFile: false,
              babelrc: false,
              sourceType: 'unambiguous',
              presets: [['@babel/preset-env', {targets: {chrome: '68'}, bugfixes: true}]],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          // react-native-vector-icons ships .ttf; on web they load as font files.
          test: /\.(ttf|otf|woff2?|png|jpe?g|gif|svg|webp|avif)$/,
          type: 'asset/resource',
          generator: {filename: 'static/[name].[hash:8][ext]'},
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'web/index.html'),
        inject: 'body',
        templateParameters: {tvTarget},
      }),
      new (require('webpack').DefinePlugin)({
        // react-native's source branches on these.
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      }),
    ],
    devServer: {
      static: {directory: outputDir},
      port: 8082,
      historyApiFallback: true,
      hot: true,
    },
    performance: {hints: false},
  };
};
