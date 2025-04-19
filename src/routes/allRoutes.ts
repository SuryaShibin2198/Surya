import { Router } from 'express';
import Paths from '../constants/paths';
import categoryService from '../services/categoryService';
import subCategoryService from '../services/subCategoryService';
import productService from '../services/productService';
import wishlistService from '../services/wishlistService';
import cartService from '../services/cartService';
import orderService from '../services/orderService';
import pincodeService from '../services/pincodeService';
import CouponService from '../services/couponService';
import offerService from '../services/offerService';

const CategoryRouter = Router();
const SubCategoryRouter = Router();
const ProductRouter = Router();
const WishlistRouter = Router();
const CartRouter = Router();
const OrderRouter = Router();
const CouponRouter = Router();
const PincodeRouter = Router();
const OfferRouter = Router();

CategoryRouter.get(Paths.Category.getAll, categoryService.getAll);
CategoryRouter.get(Paths.Category.getOne, categoryService.getOne);
CategoryRouter.post(Paths.Category.add, categoryService.add);
CategoryRouter.put(Paths.Category.update, categoryService.update);
CategoryRouter.delete(Paths.Category.delete, categoryService.Delete);

SubCategoryRouter.get(Paths.SubCategory.getAll, subCategoryService.getAll);
SubCategoryRouter.get(Paths.SubCategory.getOne, subCategoryService.getOne);
SubCategoryRouter.post(Paths.SubCategory.add, subCategoryService.add);
SubCategoryRouter.put(Paths.SubCategory.update, subCategoryService.update);
SubCategoryRouter.delete(Paths.SubCategory.delete, subCategoryService.Delete);

ProductRouter.get(Paths.Product.getAll, productService.getAll);
ProductRouter.get(Paths.Product.getOne, productService.getOne);
ProductRouter.post(Paths.Product.add, productService.add);
ProductRouter.put(Paths.Product.update, productService.update);
ProductRouter.delete(Paths.Product.delete, productService.Delete);

WishlistRouter.post(Paths.Wishlist.add, wishlistService.add);
WishlistRouter.delete(Paths.Wishlist.remove, wishlistService.remove);
WishlistRouter.get(Paths.Wishlist.getAll, wishlistService.getAll);

CartRouter.post(Paths.Cart.addToCart, cartService.addToCart);
CartRouter.delete(Paths.Cart.removeCartItem, cartService.removeCartItem);
CartRouter.get(Paths.Cart.getCartItems, cartService.getCartItems);
CartRouter.post(Paths.Cart.updateCartQuantity, cartService.updateCartQuantity);

OrderRouter.post(Paths.Order.placeOrder, orderService.placeOrder);
OrderRouter.post(Paths.Order.cancelOrder, orderService.cancelOrder);
OrderRouter.get(Paths.Order.getAll, orderService.getAll);
OrderRouter.get(Paths.Order.getOne, orderService.getOne);
OrderRouter.post(Paths.Order.pushNotification, orderService.pushNotification);

CouponRouter.post(Paths.Coupon.add, CouponService.add);
CouponRouter.get(Paths.Coupon.add, CouponService.getAll);

PincodeRouter.get(Paths.Pincode.getAll, pincodeService.getAll);
PincodeRouter.get(Paths.Pincode.getOne, pincodeService.getOne);
PincodeRouter.post(Paths.Pincode.add, pincodeService.add);
PincodeRouter.put(Paths.Pincode.update, pincodeService.update);
PincodeRouter.delete(Paths.Pincode.delete, pincodeService.Delete);

OfferRouter.get(Paths.Offer.getAll, offerService.getAll);
OfferRouter.get(Paths.Offer.getOne, offerService.getOne);
OfferRouter.post(Paths.Offer.add, offerService.add);
OfferRouter.put(Paths.Offer.update, offerService.update);
OfferRouter.delete(Paths.Offer.delete, offerService.Delete);

export default {
  CategoryRouter,
  SubCategoryRouter,
  ProductRouter,
  WishlistRouter,
  CartRouter,
  OrderRouter,
  CouponRouter,
  PincodeRouter,
  OfferRouter
} as const;
