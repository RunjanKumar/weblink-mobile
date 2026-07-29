import type {NavigatorScreenParams} from '@react-navigation/native';
import type {FacilityType} from '../models/facility.model';
import type {Food} from '../models/food.model';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: {email?: string} | undefined;
};

/**
 * ONE shared route map for every stack. The tab navigators below register
 * SUBSETS of these routes at runtime (Food tab gets the food routes, etc.);
 * sharing the type keeps every screen's Props stable regardless of which
 * stack hosts it.
 */
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
  /** `foodCategoryId` = quick-call deep link (reference dashboard behavior). */
  Food: {foodCategoryId?: string} | undefined;
  FoodDetail: {food: Food};
  CouponDetail: {couponId: string};
  Cart: undefined;
  OrderHistory: undefined;
  Reception: undefined;
  Profile: undefined;
  Settings: undefined;
};

/**
 * Reference `BottomNav.jsx` tab set: Home, Reception, Food, Facilities,
 * Services. (Profile/Settings moved into the dashboard kebab menu.)
 */
export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  ReceptionTab: undefined;
  FoodTab: NavigatorScreenParams<HomeStackParamList>;
  FacilitiesTab: NavigatorScreenParams<HomeStackParamList>;
  ServicesTab: NavigatorScreenParams<HomeStackParamList>;
};

// Enables typed `navigation`/`route` across the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, AppTabParamList, HomeStackParamList {}
  }
}
