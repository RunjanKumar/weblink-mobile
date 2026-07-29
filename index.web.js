/**
 * @format
 * Web / LG webOS entry point.
 *
 * Mirrors `index.js` (the native entry) but ends in `AppRegistry.runApplication`
 * against a real DOM node instead of leaving the host to start the app.
 *
 * IMPORTANT ordering:
 *  1. `core-js/stable` before everything — webOS runs an old Chromium that is
 *     missing modern built-ins (Array#findLastIndex, Object.fromEntries, ...).
 *     preset-env's `useBuiltIns: 'entry'` rewrites this one import into just
 *     the polyfills the target lacks, and they must be installed before any
 *     dependency runs. Web/webOS only — the native entry (index.js) does not
 *     need it, since Hermes ships these already.
 *  2. `react-native-gesture-handler` next (React Navigation).
 *  3. `./global.css` — on web this is real Tailwind CSS emitted by PostCSS,
 *     not NativeWind's native StyleSheet output.
 */
import 'core-js/stable';
import 'react-native-gesture-handler';
import './global.css';

import {AppRegistry} from 'react-native';
import App from './App';
// Default import, not `{name}` — webpack is deprecating named exports from JSON.
import appJson from './app.json';
import {installWebOSRemote} from './src/services/webosRemote.web';
import ioniconsFont from 'react-native-vector-icons/Fonts/Ionicons.ttf';

/**
 * react-native-vector-icons renders glyphs from an icon font. The native builds
 * get it from `fonts.gradle`; on web nothing registers it, and every icon would
 * render as a tofu box. Webpack turns the .ttf import above into a URL, which we
 * declare here as a @font-face under the exact family name the library asks for.
 */
function registerIconFont() {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(
      `@font-face { src: url(${ioniconsFont}); font-family: Ionicons; font-display: block; }`,
    ),
  );
  document.head.appendChild(style);
}

registerIconFont();

// Arrow-key focus movement + the webOS Back button. No-op in a desktop browser
// beyond making arrows navigate, which is handy for testing.
installWebOSRemote();

const appName = appJson.name;

AppRegistry.registerComponent(appName, () => App);

AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
