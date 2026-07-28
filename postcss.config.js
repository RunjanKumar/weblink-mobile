/**
 * PostCSS is web-only. On native, Metro + `nativewind/metro` compile
 * `global.css` into RN styles; on web, Tailwind emits real CSS here and
 * react-native-css-interop's web runtime maps `className` onto the DOM node.
 *
 * Both paths read the same `tailwind.config.js`, so the design tokens cannot
 * drift between the APK and the .ipk.
 */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
