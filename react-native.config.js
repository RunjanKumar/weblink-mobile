/**
 * react-native-vector-icons ships font files that must be bundled into the app.
 * On Android they are copied at build time via the `fonts.gradle` applied in
 * `android/app/build.gradle`. This config also lets `npx react-native-asset`
 * copy them if you prefer that route.
 */
module.exports = {
  project: {
    android: {},
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts'],
};
