import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {HomeStackParamList} from './types';
import {IS_TV} from '../utils/responsive';
import {useTheme} from '../theme';
import {DashboardScreen} from '../screens/Home/DashboardScreen';
import {LightsScreen} from '../screens/RoomControls/LightsScreen';
import {AcScreen} from '../screens/RoomControls/AcScreen';
import {FeedbackScreen} from '../screens/Feedback/FeedbackScreen';
import {ServiceCatalogScreen} from '../screens/Services/ServiceCatalogScreen';
import {ReviewRequestScreen} from '../screens/Services/ReviewRequestScreen';
import {AddDetailsScreen} from '../screens/Services/AddDetailsScreen';
import {BookedServicesScreen} from '../screens/Services/BookedServicesScreen';
import {LaundryScreen} from '../screens/Laundry/LaundryScreen';
import {LaundryOrdersScreen} from '../screens/Laundry/LaundryOrdersScreen';
import {FacilitiesScreen} from '../screens/Facilities/FacilitiesScreen';
import {FacilityDetailScreen} from '../screens/Facilities/FacilityDetailScreen';
import {FacilityReserveScreen} from '../screens/Facilities/FacilityReserveScreen';
import {FacilityBookingsScreen} from '../screens/Facilities/FacilityBookingsScreen';
import {ChatScreen} from '../screens/Chat/ChatScreen';
import {FoodMenuScreen} from '../screens/Food/FoodMenuScreen';
import {FoodDetailScreen} from '../screens/Food/FoodDetailScreen';
import {CartScreen} from '../screens/Food/CartScreen';
import {OrderHistoryScreen} from '../screens/Food/OrderHistoryScreen';
import {CouponDetailScreen} from '../screens/Food/CouponDetailScreen';
import {ReceptionScreen} from '../screens/Reception/ReceptionScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  const {theme} = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // TV overscan-safe horizontal inset so content/focus rings aren't clipped.
        contentStyle: {backgroundColor: theme.colors.background, paddingHorizontal: IS_TV ? 24 : 0},
      }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Lights" component={LightsScreen} />
      <Stack.Screen name="Ac" component={AcScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Services" component={ServiceCatalogScreen} />
      <Stack.Screen name="ServiceReview" component={ReviewRequestScreen} />
      <Stack.Screen name="ServiceAddDetails" component={AddDetailsScreen} />
      <Stack.Screen name="ServiceBooked" component={BookedServicesScreen} />
      <Stack.Screen name="Laundry" component={LaundryScreen} />
      <Stack.Screen name="LaundryOrders" component={LaundryOrdersScreen} />
      <Stack.Screen name="Facilities" component={FacilitiesScreen} />
      <Stack.Screen name="FacilityDetail" component={FacilityDetailScreen} />
      <Stack.Screen name="FacilityReserve" component={FacilityReserveScreen} />
      <Stack.Screen name="FacilityBookings" component={FacilityBookingsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Food" component={FoodMenuScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="CouponDetail" component={CouponDetailScreen} />
      <Stack.Screen name="Reception" component={ReceptionScreen} />
    </Stack.Navigator>
  );
}
