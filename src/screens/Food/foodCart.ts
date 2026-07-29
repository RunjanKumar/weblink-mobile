import type {AddOn, Food} from '../../models/food.model';

/**
 * Map an API food/add-on object to a cart line item. Extracted from
 * FoodMenuScreen so the Food components (AddButton, FoodCard) can use it
 * without importing a screen (circular-import hazard).
 */
export function toCartItem(food: Food) {
  return {
    id: food._id,
    foodId: food._id,
    title: food.name,
    name: food.name,
    price: food.price,
    priceAfterDiscount: food.priceAfterDiscount,
    imageURL: food.imageURL,
    type: food.type,
    couponData: food.couponData,
  };
}

/** Add-ons are independent top-level cart lines (reference behavior). */
export function addOnToCartItem(addOn: AddOn, parentFoodTitle?: string) {
  return {
    id: addOn._id,
    foodId: addOn._id,
    title: addOn.name,
    name: addOn.name,
    price: addOn.price,
    priceAfterDiscount: addOn.priceAfterDiscount,
    imageURL: addOn.imageURL,
    type: addOn.type,
    couponData: addOn.couponData,
    isAddOn: true,
    parentFoodTitle,
  };
}
