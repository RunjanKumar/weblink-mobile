# Phase 2 — Web → RN Porting Spec

Reference for porting the remaining `weblink` web modules to React Native.
Generated from a parallel analysis of the web app. Auth/API contracts already
implemented in Phase 1 (raw `authorization` header, `{data}` envelope, axios
instance). Status enums live in `src/constants/roomControl.ts` (room) and should
be added to a `src/constants/status.ts` for the enums below.

**Delivered in Phase 2 so far:** Dashboard, Room Scenes, Lights & Fans (real API),
Climate/AC (local), Quick Calls, Quick Actions.

**Cross-cutting RN replacements** (apply to every module below):
- `react-router-dom` (`useNavigate`/`useLocation`/`location.state`) → React Navigation (`navigation.navigate`, `route.params`); `navigate(-1)` → `navigation.goBack()`; `window.history.replaceState({},'')` → `navigation.setParams({...})`.
- `sonner` toasts → a RN toast (add `react-native-toast-message`, or a small custom Toast provider).
- `localStorage` / `window.location` → our `storage`/`tokenStorage` services + `Linking`.
- `AppImage`/`<img>` → RN `<Image>` (remote CDN base `https://d36u10gu6pvj0x.cloudfront.net/`).
- All DOM/CSS → RN `View/Text/Pressable/TextInput` + NativeWind; inline SVGs → vector-icons.

---

## Status enums (add to `src/constants/status.ts`)
- `BOOKING_STATUS`: 1 PENDING, 2 IN_PROGRESS, 3 COMPLETED, 4 CANCEL.
- `TRANSACTION_STATUS`: 1 PENDING, 2 SUCCESS, 3 FAILED, 4 CANCELLED, 5 REFUNDED.
- `HOTEL_FACILITY_BOOKING_STATUS`: 1 PENDING, 2 APPROVED, 3 DISAPPROVED, 4 CANCELLED.
- `DISCOUNT_TYPES`: 1 PERCENTAGE, 2 AMOUNT, 3 BOGO.
- `LAUNDRY_ORDER_FLOW`: REQUESTED→PICKED_UP→IN_PROCESS→READY→DELIVERED (CANCELLED outside).
- `MESSAGE_STATUS`: 1 SENT, 2 DELIVERED, 3 SEEN. `USER_TYPES`: 1 ADMIN, 2 STAFF, 3 CUSTOMER.

---

## Food Ordering (biggest module — Razorpay)

**Screens:** `/food` (menu: search, offer slider, sticky category tabs + scroll-spy list, floating cart), `/food-details` (item + add-ons, qty stepper), `/coupon-detail`, `/cart` (coupon, bill, payment sheet), `/order-history` (status/payment badges, pay/retry, 30s polling).

**Endpoints:**
- `GET /v1/foodCategory?hasFoods=true&excludeCouponAppliedCategories=false` → `{data: Category[], couponData: Coupon[]}`. `Category{_id,name,foodsInCategories:Food[]}`; `Food{_id,name,description,price,priceAfterDiscount,imageURL,kcal,type,inGridients[],choiceOfAddOnDetails:AddOn[],isAvailable,couponData{discountType}}`.
- `GET /v1/foodOrder` → `data.food: Order[]`. `Order{_id,status,paymentStatus,foodItems[{quantity,price,foodDetail{name,type}}],totalPrice,totalPriceAfterDisCount,tax,taxInAmount,totalPriceAfterTax,createdAt}`.
- `POST /v1/foodOrder` → `{hotelId, foodItems:[{foodId,quantity,price}], deliveryAddress:"Room <n>", coupon?}`. Always created COD first; returns `_id`.
- `POST /v1/foodOrder/initiatePayment {foodOrderId}` → `{razorpayOrderId, amount(paise), currency, razorpayKey}`.
- `POST /v1/foodOrder/verifyPayment {foodOrderId,razorpayOrderId,razorpayPaymentId,razorpaySignature}` → `{message}`.
- `GET /v1/coupon?couponId=<id>` → `data.couponData` (obj/array[0]) `{name,image,description,discountValue,discountType,applicableItemsData:Food[]}`.
- `POST /v1/coupon/validate {foodItems:[{foodId,quantity}], name:"<CODE>"}` → `data{items:CouponItem[], summary{totalDiscount,finalPayableAmount,orderCouponDiscount}}`.

**Logic:** Cart in Context (in-memory). Discounts (`discountHelper`): PERCENTAGE→`priceAfterDiscount`; AMOUNT/BOGO→`price`; BOGO line = `unitPrice*ceil(qty/2)`. BOGO qty: add at 2, +2/−1; else +1/−1; qty≤0 removes. Tax = `hotelData.bookedFoodOrderTax%`; with coupon, backend `summary` wins. Coupon: uppercase, ≥5 chars, non-empty cart; **any cart mutation invalidates the applied coupon**. Order-history: 30s poll while any PENDING/IN_PROGRESS; `canPayOnline` = paymentStatus∈{PENDING,FAILED} && status∈{PENDING,IN_PROGRESS}.

**RN notes:** **Razorpay** = biggest change → `react-native-razorpay` `RazorpayCheckout.open(options).then(d=>verify).catch(err=>COD fallback)` (options: key,amount,currency,order_id,name,description,prefill). Scroll-spy → `FlatList` + `onViewableItemsChanged`/`scrollToIndex`. Consider persisting cart to `storage`. Requires adding `react-native-razorpay` (native module → re-run bootstrap/autolink).

---

## Hotel Services (request flow)

**Screens:** `/services` (accordion catalog, Request toggles, sticky Review button), `/services/review` (selected items grouped, delete, add/edit details, Send), `/services/add-details` (note textarea), `/services/pending` (history grouped by status).

**Endpoints:**
- `GET /v1/hotelServices` → `data.serviceData: [{_id,name,from,to,isAvailable,subCategoriesIds:[{_id,name,description,icon,price}]}]`.
- `GET /v1/hotelServices/book/customer` → `data: [{_id,name,description,details,status,subCategoryId,requestedAt}]`.
- `POST /v1/hotelServices/book` → **one POST per category** `{hotelFacilityId:<catId>, subCategory:[{subCategoryId,description}]}`.

**Logic:** Cart in Context (`Set<subcategoryId>` + `{[id]:note}`). Already-booked lock: subcategories with a booked item in status {PENDING,IN_PROGRESS} become non-toggleable "Requested". Availability: `isAvailable===false` disables. Submit loops categories sequentially, then `clearAll()`. Status enum BOOKING_STATUS.

**RN notes:** ServiceRequest Context wraps the navigator. No payments/sockets. Accordion → `LayoutAnimation`/Reanimated.

---

## Facilities

**Screens:** `/facilities` (category tabs + facility cards), `/facilities/detail` (from route params), `/facilities/reserve` (datetime + guests), `/facilities/upcoming-events` (bookings).

**Endpoints:**
- `GET /v1/hotelFacility` → categories `[{_id,name,imageUrl,types:[{_id,facilityId,name,description,image,startTime,endTime,days[0-6],isAvailable,cuisine,location,locationlink,pricing,phoneNumber,capacity,area,type}]}]`.
- `POST /v1/hotelFacility/book {facilityId,facilityTypeId,bookingDate,numberOfGuests}`.
- `GET /v1/hotelFacility/book` → `[{_id,facilityName,facilityTypeName,bookingDate,numberOfGuests,status}]`.

**Logic:** First category auto-selected; active category's `types[]` = cards. Status HOTEL_FACILITY_BOOKING_STATUS (colors: 1 red, 2 green, 3 red, 4 gray). Reserve people options [1..8,10,12,15,20]. `isAvailable===false` disables + grayscale.

**RN notes:** `datetime-local` → `@react-native-community/datetimepicker`. People dropdown → modal/ActionSheet. `formatTime12Hour`/`formatDays`/date formatting → dayjs or verify Hermes Intl.

---

## Chat (Socket.IO)

**Screen:** `/chat` — reception peer, history via REST + live via singleton socket. Bubbles, delivery ticks, optimistic send + offline queue.

**REST:** `GET /conversation/list?skip&limit` (PAGE_SIZE 20) → `data{data:[msg], totalCount}` (newest-first, reverse for display). Msg raw `{_id,message,senderId,senderData{name,userType},receivedBy:[{userId,status}],createdAt,messageType}`.

**Socket:** URL `https://chat-hotel-automation.wattinventive.com`, JWT via `query:{authorization:token}`, transports ['websocket','polling'], reconnection. Client→server: `sendMessage{message,tempId}`, `readMessage{messageId}`, `typing`(unused). Server→client: `newMessage`, `readMessage`, lifecycle events.

**Logic:** Normalized msg `{id,text,senderId,senderName,senderType,isOwn,timestamp,messageStatus,tempId,isSending,isFailed}`. `isOwn` = senderId===me OR userType===CUSTOMER. Optimistic send with `tempId=temp_<n>`; 2s fallback flips isSending→sent; reconcile incoming by tempId/text; dedup via Set. Read receipts auto for visible incoming <SEEN. Offline queue flushes on reconnect. Pagination on scroll-to-top.

**RN notes:** `socket.io-client` works as-is (keep singleton). `navigator.onLine`/`online`/`offline` → `@react-native-community/netinfo`. Chat list → **inverted `FlatList`** (drops manual scroll math). `SocketProvider` connects when authenticated; already have `config.socketUrl`.

---

## Feedback

**Screen:** `/feedback` — star rating (1–5) + notes textarea + submit.
**Endpoint:** `POST /v1/feedback {star, notes}`.
**Logic:** local state only; success toast + reset; star=0 allowed.
**RN notes:** stars → vector-icons (fill when `star<=rating`); `onChangeText` (string, not `event.target.value`).

---

## Laundry

**Screens:** `/laundry` (rate list + basket builder, express toggle, notes, sticky summary + Request Pickup), `/laundry/orders` (In Progress / Past, cancel while REQUESTED).

**Endpoints (need `hotelId` from profile):**
- `GET /v1/laundry/guest/rate-list?hotelId=<id>` → `data.items:[{_id,name,unit?,rates:[{serviceType,rate}]}]`.
- `POST /v1/laundry/guest/order {hotelId, items:[{itemId,serviceType,qty}], isExpress, notes}`.
- `GET /v1/laundry/guest/order?hotelId=<id>&limit=50` → `data.orders:[Order]` (`Order{_id,orderNumber,status,isExpress,createdAt,taxPercentage?,totalAmount,items:[{itemId,itemName,serviceType,qty,amount}],folio?{transactionId}}`).
- `PATCH /v1/laundry/guest/order/:id/cancel {hotelId, reason}` (only while REQUESTED).

**Logic:** basket map `itemId→{serviceType,qty}` (default rates[0], qty 0 deletes). Preview math: `amount=rate*qty`, `tax=subTotal*bookedRoomTax%`. Split active vs {DELIVERED,CANCELLED}. "Added to your room bill" when DELIVERED && folio.transactionId. Full refetch after mutations.

**RN notes:** sticky bar → absolute view + KeyboardAvoidingView. Express toggle → our `Toggle`. Charges post to folio server-side (no checkout).

---

## Reception

**Screen:** `/reception` — static info + Continue → `/chat`. No API.
**Quick calls (done in Phase 2):** `handleQuickCallClick` → CALL(1)+supportNumber = `Linking.openURL('tel:…')`; FOOD_MANAGEMENT(2) = navigate Food with `foodCategoryId`.
