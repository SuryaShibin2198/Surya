import { Router } from 'express';
import Paths from '../constants/paths';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from '../services/userService';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import all from './allRoutes';

const UserRouter = Router();

UserRouter.post(Paths.User.register, register);
UserRouter.post(Paths.User.login, login);
UserRouter.post(Paths.User.forgotPassword, forgotPassword);
UserRouter.post(Paths.User.resetPassword, resetPassword);
UserRouter.post(Paths.User.logout, authMiddleware, logout);

UserRouter.use(Paths.Category.Base, authMiddleware, all.CategoryRouter);
UserRouter.use(Paths.SubCategory.Base, authMiddleware, all.SubCategoryRouter);
UserRouter.use(Paths.Product.Base, authMiddleware, all.ProductRouter);
UserRouter.use(Paths.Wishlist.Base, authMiddleware, all.WishlistRouter);
UserRouter.use(Paths.Cart.Base, authMiddleware, all.CartRouter);
UserRouter.use(Paths.Order.Base, authMiddleware, all.OrderRouter);
UserRouter.use(Paths.Coupon.Base, authMiddleware, all.CouponRouter);
UserRouter.use(Paths.Pincode.Base, authMiddleware, all.PincodeRouter);
UserRouter.use(Paths.Offer.Base, authMiddleware, all.OfferRouter);

export default UserRouter;
