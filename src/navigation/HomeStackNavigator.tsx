import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {HomeStackParamList} from './types';
import {IS_TV} from '../utils/responsive';
import {useTheme} from '../theme';
import {DashboardScreen} from '../screens/Home/DashboardScreen';
import {TvDashboardScreen} from '../screens/Home/TvDashboardScreen';
import {LightsScreen} from '../screens/RoomControls/LightsScreen';
import {TvLightsScreen} from '../screens/RoomControls/TvLightsScreen';
import {AcScreen} from '../screens/RoomControls/AcScreen';
import {TvAcScreen} from '../screens/RoomControls/TvAcScreen';
import {FeedbackScreen} from '../screens/Feedback/FeedbackScreen';
import {TvFeedbackScreen} from '../screens/Feedback/TvFeedbackScreen';
import {ServiceCatalogScreen} from '../screens/Services/ServiceCatalogScreen';
import {TvServiceRequestScreen} from '../screens/Services/TvServiceRequestScreen';
import {ReviewRequestScreen} from '../screens/Services/ReviewRequestScreen';
import {AddDetailsScreen} from '../screens/Services/AddDetailsScreen';
import {BookedServicesScreen} from '../screens/Services/BookedServicesScreen';
import {TvReviewRequestsScreen} from '../screens/Services/TvReviewRequestsScreen';
import {LaundryScreen} from '../screens/Laundry/LaundryScreen';
import {TvLaundryScreen} from '../screens/Laundry/TvLaundryScreen';
import {TvLaundryCartScreen} from '../screens/Laundry/TvLaundryCartScreen';
import {LaundryOrdersScreen} from '../screens/Laundry/LaundryOrdersScreen';
import {TvLaundryOrdersScreen} from '../screens/Laundry/TvLaundryOrdersScreen';
import {FacilitiesScreen} from '../screens/Facilities/FacilitiesScreen';
import {TvFacilitiesScreen} from '../screens/Facilities/TvFacilitiesScreen';
import {FacilityDetailScreen} from '../screens/Facilities/FacilityDetailScreen';
import {FacilityReserveScreen} from '../screens/Facilities/FacilityReserveScreen';
import {TvFacilityScheduleScreen} from '../screens/Facilities/TvFacilityScheduleScreen';
import {FacilityBookingsScreen} from '../screens/Facilities/FacilityBookingsScreen';
import {TvFacilityBookingsScreen} from '../screens/Facilities/TvFacilityBookingsScreen';
import {ChatScreen} from '../screens/Chat/ChatScreen';
import {TvChatScreen} from '../screens/Chat/TvChatScreen';
import {FoodMenuScreen} from '../screens/Food/FoodMenuScreen';
import {TvFoodMenuScreen} from '../screens/Food/TvFoodMenuScreen';
import {FoodDetailScreen} from '../screens/Food/FoodDetailScreen';
import {CartScreen} from '../screens/Food/CartScreen';
import {TvCartScreen} from '../screens/Food/TvCartScreen';
import {OrderHistoryScreen} from '../screens/Food/OrderHistoryScreen';
import {TvOrderHistoryScreen} from '../screens/Food/TvOrderHistoryScreen';
import {TvOrderDetailScreen} from '../screens/Food/TvOrderDetailScreen';
import {CouponDetailScreen} from '../screens/Food/CouponDetailScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {TvProfileScreen} from '../screens/Profile/TvProfileScreen';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';
import {TvSettingsScreen} from '../screens/Settings/TvSettingsScreen';
import {ViewBillScreen} from '../screens/Bill/ViewBillScreen';
import {TvViewBillScreen} from '../screens/Bill/TvViewBillScreen';
import {MyDayScreen} from '../screens/MyDay/MyDayScreen';
import {TvMyDayScreen} from '../screens/MyDay/TvMyDayScreen';

/**
 * All stacks share `HomeStackParamList` (see types.ts) — each navigator
 * registers its own subset of routes, mirroring the reference tab pages.
 */
const Stack = createNativeStackNavigator<HomeStackParamList>();

function useStackScreenOptions() {
  const {theme} = useTheme();
  return {
    headerShown: false as const,
    // TV overscan-safe horizontal inset so content/focus rings aren't clipped.
    contentStyle: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: IS_TV ? 24 : 0,
    },
  };
}

/** Home tab: dashboard + room controls + laundry + chat + profile/settings. */
export function HomeStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* TV gets the mockup home screen; the phone dashboard is untouched. */}
      <Stack.Screen name="Dashboard" component={IS_TV ? TvDashboardScreen : DashboardScreen} />
      {/* Same split as Dashboard: the TV wears the glass design system. */}
      <Stack.Screen name="Lights" component={IS_TV ? TvLightsScreen : LightsScreen} />
      <Stack.Screen name="Ac" component={IS_TV ? TvAcScreen : AcScreen} />
      <Stack.Screen name="Feedback" component={IS_TV ? TvFeedbackScreen : FeedbackScreen} />
      <Stack.Screen name="Laundry" component={IS_TV ? TvLaundryScreen : LaundryScreen} />
      {/* TV-only: the phone submits straight from the rate list, where a tap is
          deliberate; a remote needs the confirm step. */}
      {IS_TV ? <Stack.Screen name="LaundryCart" component={TvLaundryCartScreen} /> : null}
      <Stack.Screen
        name="LaundryOrders"
        component={IS_TV ? TvLaundryOrdersScreen : LaundryOrdersScreen}
      />
      <Stack.Screen name="Chat" component={IS_TV ? TvChatScreen : ChatScreen} />
      {/* The dashboard's ⋮ menu and its VIEW BILL chip land here, so on TV they
          wear the same glass as the dashboard they were opened from. */}
      <Stack.Screen name="Profile" component={IS_TV ? TvProfileScreen : ProfileScreen} />
      <Stack.Screen name="Settings" component={IS_TV ? TvSettingsScreen : SettingsScreen} />
      <Stack.Screen name="ViewBill" component={IS_TV ? TvViewBillScreen : ViewBillScreen} />
      <Stack.Screen name="MyDay" component={IS_TV ? TvMyDayScreen : MyDayScreen} />
    </Stack.Navigator>
  );
}

/** Food tab (reference BottomNav "Food"). */
export function FoodStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Same split as Dashboard/Lights: the TV wears the glass design system,
          the phone screens are untouched. FoodDetail and CouponDetail have no
          TV frame in the client's Figma — the TV menu adds in one press. */}
      <Stack.Screen name="Food" component={IS_TV ? TvFoodMenuScreen : FoodMenuScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <Stack.Screen name="Cart" component={IS_TV ? TvCartScreen : CartScreen} />
      <Stack.Screen
        name="OrderHistory"
        component={IS_TV ? TvOrderHistoryScreen : OrderHistoryScreen}
      />
      {/* TV-only frame; the phone shows its bill inline on the history card. */}
      {IS_TV ? <Stack.Screen name="OrderDetail" component={TvOrderDetailScreen} /> : null}
      <Stack.Screen name="CouponDetail" component={CouponDetailScreen} />
    </Stack.Navigator>
  );
}

/** Facilities tab (reference BottomNav "Facilities"). */
export function FacilitiesStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Same split as Dashboard/Services: the TV wears the glass design system,
          the phone screens are untouched. */}
      <Stack.Screen name="Facilities" component={IS_TV ? TvFacilitiesScreen : FacilitiesScreen} />
      {/* The TV frame puts a facility's details INSIDE the availability pane, so
          both phone routes resolve there rather than to a phone page the remote
          cannot drive (its date-time dialog needs a touch screen). */}
      <Stack.Screen
        name="FacilityDetail"
        component={IS_TV ? TvFacilityScheduleScreen : FacilityDetailScreen}
      />
      <Stack.Screen
        name="FacilityReserve"
        component={IS_TV ? TvFacilityScheduleScreen : FacilityReserveScreen}
      />
      {/* TV-only: reached with no facility chosen from the frame's VIEW SCHEDULE. */}
      {IS_TV ? (
        <Stack.Screen name="FacilitySchedule" component={TvFacilityScheduleScreen} />
      ) : null}
      <Stack.Screen
        name="FacilityBookings"
        component={IS_TV ? TvFacilityBookingsScreen : FacilityBookingsScreen}
      />
    </Stack.Navigator>
  );
}

/** Services tab (reference BottomNav "Services"). */
export function ServicesStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Same split as Dashboard/Laundry: the TV wears the glass design system,
          the phone screens are untouched. */}
      <Stack.Screen name="Services" component={IS_TV ? TvServiceRequestScreen : ServiceCatalogScreen} />
      {/* The TV frame keeps the request list permanently beside the cards, so it
          IS the review — Chat's quick-service shortcut lands on the same screen
          rather than a phone page with no cards on it. */}
      <Stack.Screen
        name="ServiceReview"
        component={IS_TV ? TvServiceRequestScreen : ReviewRequestScreen}
      />
      {/* Phone-only: the TV edits a service's note in its right column. */}
      <Stack.Screen name="ServiceAddDetails" component={AddDetailsScreen} />
      <Stack.Screen name="ServiceBooked" component={IS_TV ? TvReviewRequestsScreen : BookedServicesScreen} />
    </Stack.Navigator>
  );
}
