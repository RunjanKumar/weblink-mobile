import type {NavigatorScreenParams} from '@react-navigation/native';
import type {FacilityType} from '../models/facility.model';
import type {Food} from '../models/food.model';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: {email?: string} | undefined;
};

// Screens pushed on top of the Dashboard (inside the Home tab).
export type HomeStackParamList = {
  Dashboard: undefined;
  Lights: undefined;
  Ac: undefined;
  Feedback: undefined;
  Services: undefined;
  ServiceReview: undefined;
  ServiceAddDetails: {subCategoryId: string; subCategoryName?: string};
  ServiceBooked: undefined;
  Laundry: undefined;
  LaundryOrders: undefined;
  Facilities: undefined;
  FacilityDetail: {facility: FacilityType; categoryName?: string};
  FacilityReserve: {facility: FacilityType};
  FacilityBookings: undefined;
  Chat: undefined;
  Food: undefined;
  FoodDetail: {food: Food};
  CouponDetail: {couponId: string};
  Cart: undefined;
  OrderHistory: undefined;
  Reception: undefined;
};

export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Booking: undefined;
  Profile: undefined;
  Settings: undefined;
};

// Enables typed `navigation`/`route` across the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppTabParamList, HomeStackParamList {}
  }
}
