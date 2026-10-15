import React from 'react';
import {Pressable, type StyleProp, type ViewStyle} from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
  type BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import {CommonActions} from '@react-navigation/native';
import {WebIcon, type WebIconName} from '../components';
import type {AppTabParamList} from './types';
import {IS_TV} from '../utils/responsive';
import {useTVFocus} from '../hooks/useTVFocus';
import {useTheme} from '../theme';
import {
  HomeStackNavigator,
  FoodStackNavigator,
  FacilitiesStackNavigator,
  ServicesStackNavigator,
} from './HomeStackNavigator';
// The Reception tab now opens the live chat directly — the client did not want
// the guest to sit through an intro page first. `ReceptionScreen` (the "Contact
// the Hotel Receptionist" page) is kept in the repo, just no longer routed.
// import {ReceptionScreen} from '../screens/Reception/ReceptionScreen';
import {ChatScreen} from '../screens/Chat/ChatScreen';
import {TvChatScreen} from '../screens/Chat/TvChatScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

/**
 * Reference `BottomNav.jsx` tab set and glyphs: Home, Reception, Food,
 * Facilities, Services. `home` and `facilities` fill when active (web
 * behavior); the rest stay stroked.
 */
const TABS: {name: keyof AppTabParamList; title: string; icon: WebIconName; fills: boolean}[] = [
  {name: 'Home', title: 'Home', icon: 'home', fills: true},
  {name: 'ReceptionTab', title: 'Reception', icon: 'reception', fills: false},
  {name: 'FoodTab', title: 'Food', icon: 'food', fills: false},
  {name: 'FacilitiesTab', title: 'Facilities', icon: 'facilities', fills: true},
  {name: 'ServicesTab', title: 'Services', icon: 'services', fills: false},
];

const ICON_BY_ROUTE = Object.fromEntries(TABS.map(t => [t.name, t])) as Record<
  keyof AppTabParamList,
  (typeof TABS)[number]
>;

/**
 * TV only: a tab forgets its screens the moment the guest leaves it.
 *
 * The TV has no tab bar — the dashboard and the header jump straight to a
 * screen INSIDE a tab (header cart → FoodTab/Cart, Food Order tile →
 * FoodTab/Food). Tabs normally keep their stack, so after Cart → Back, a later
 * Food Order became [Cart, Food] and Back landed on the cart instead of the
 * dashboard the guest came from. Popping to top is not enough (the top of that
 * stack IS Cart), and a reset stack would still be mounted and push on top of
 * its initial route. A fresh route key unmounts the tab's navigator, so the
 * next jump builds the stack from scratch with exactly the screen asked for.
 *
 * Keyed on the tab NAME, not on `route.state`: a nested stack that was opened
 * through `navigate(tab, {screen})` is not mirrored into the tab route's `state`
 * at blur time, so checking for it skipped exactly the case this is for.
 */
const STACK_TABS: ReadonlySet<string> = new Set(['FoodTab', 'FacilitiesTab', 'ServicesTab']);

function forgetTab(
  navigation: BottomTabNavigationProp<AppTabParamList>,
  route: {key: string; name: string},
): void {
  if (!STACK_TABS.has(route.name)) {
    return; // Home stays as is; the Reception chat has no stack to forget
  }
  const state = navigation.getState();
  navigation.dispatch({
    ...CommonActions.reset({
      ...state,
      routes: state.routes.map(r =>
        r.key === route.key ? {key: `${r.name}-${Date.now()}`, name: r.name} : r,
      ),
    }),
    target: state.key,
  });
}

/**
 * Tab button with a D-pad focus ring.
 *
 * The default tab button only distinguishes the ACTIVE tab (tint colour). With
 * a remote you also need to see which tab the highlight is currently on before
 * you press OK — otherwise moving down into the bar looks like nothing happened.
 */
function TabBarButton(props: BottomTabBarButtonProps) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  // `href` MUST NOT reach the Pressable. react-native-web renders an <a> as
  // soon as href is present (exports/View/index.js), and React Navigation
  // supplies one for web deep links. On webOS the app is served from file://,
  // so following that link navigates the document to a path that does not
  // exist — the page dies with net::ERR_ACCESS_DENIED (-10) and webOS replaces
  // the whole app with its "UNABLE TO LOAD" screen. `onPress` below already
  // performs the navigation; the anchor is pure downside here.
  // `ref` is typed for the navigator's own element and conflicts with Pressable's.
  const {children, style, href: _href, ref: _ref, ...rest} = props;
  return (
    <Pressable
      {...rest}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[
        style as StyleProp<ViewStyle>,
        {
          borderRadius: 12,
          borderWidth: 2,
          borderColor: focused ? theme.colors.focusRing : 'transparent',
        },
      ]}>
      {children}
    </Pressable>
  );
}

export function AppNavigator() {
  const {theme} = useTheme();
  // TV needs a taller bar so D-pad focus targets are comfortable.
  // IS_TV, not Platform.isTV: the latter is always false under react-native-web,
  // so webOS was silently getting the 64px phone bar.
  const barHeight = IS_TV ? 84 : 64;

  return (
    <Tab.Navigator
      screenListeners={
        IS_TV ? ({navigation, route}) => ({blur: () => forgetTab(navigation, route)}) : undefined
      }
      screenOptions={({route}) => ({
        headerShown: false,
        // On TV the home screen is the fixed dark golden-glass mockup, so the
        // bar matches it instead of the app theme; phone keeps the theme.
        tabBarActiveTintColor: IS_TV ? '#D4B483' : theme.colors.primary,
        tabBarInactiveTintColor: IS_TV ? 'rgba(237,231,223,0.55)' : theme.colors.muted,
        // TV: no bottom bar at all (mockup) — every tab stays REGISTERED and is
        // reached from the dashboard tiles/menu; the remote's Back returns to
        // Home from another tab instead of exiting (see navigationRef).
        tabBarStyle: IS_TV
          ? {display: 'none' as const}
          : {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              height: barHeight,
              paddingBottom: 8,
              paddingTop: 8,
            },
        tabBarLabelStyle: {fontSize: IS_TV ? 13 : 11, fontWeight: '500'},
        tabBarButton: props => <TabBarButton {...props} />,
        tabBarIcon: ({color, size, focused}) => {
          const tab = ICON_BY_ROUTE[route.name];
          return (
            <WebIcon
              name={tab.icon}
              color={color}
              size={IS_TV ? 28 : size}
              filled={focused && tab.fills}
            />
          );
        },
      })}>
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{title: 'Home'}} />
      <Tab.Screen
        name="ReceptionTab"
        // The Reception TAB is the chat itself (the phone's intro page has no
        // ten-foot equivalent); TV wears the glass design system.
        component={(IS_TV ? TvChatScreen : ChatScreen) as unknown as React.ComponentType}
        // Every other TV screen sits in a stack that insets it by 24 for overscan
        // (useStackScreenOptions), and TvBackdrop bleeds back out by exactly that.
        // This tab has no stack, so without the same inset the chat ran 24px
        // closer to the bezel than every other screen.
        options={{title: 'Reception', ...(IS_TV ? {sceneStyle: {paddingHorizontal: 24}} : {})}}
      />
      <Tab.Screen name="FoodTab" component={FoodStackNavigator} options={{title: 'Food'}} />
      <Tab.Screen
        name="FacilitiesTab"
        component={FacilitiesStackNavigator}
        options={{title: 'Facilities'}}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStackNavigator}
        options={{title: 'Services'}}
      />
    </Tab.Navigator>
  );
}
