/**
 * @format
 * App entry point.
 *
 * IMPORTANT ordering:
 *  1. `react-native-gesture-handler` must be imported first (React Navigation).
 *  2. `./global.css` registers NativeWind's Tailwind styles.
 */
import 'react-native-gesture-handler';
import './global.css';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
