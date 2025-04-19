import { Response } from 'express';
import { CartItemReq } from '../types/cartTypes';
import CommonHelper from '../helpers/CommonHelper';
import HSC from '../constants/HttpStatusCodes';
import { Product } from '../models/productModel';
import Cart from '../models/cartModel';
import CartItem from '../models/cartItemModel';
import { CommonError } from '../types/common/common';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { TransportOptions } from 'nodemailer';
import User from '../models/userModel';
import { Wishlist } from '../models/wishlistModel';
const addToCart = async (req: CartItemReq, res: Response) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id;

    if (!userId || !productId) {
      return CommonHelper.ResponseError(
        res,
        'User ID and Product ID are required',
        HSC.BAD_REQUEST
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return CommonHelper.ResponseError(
        res,
        'Product not found',
        HSC.NOT_FOUND
      );
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, createdBy: userId });
      await cart.save();
    }

    let cartItem = await CartItem.findOne({
      userId,
      productId,
      deletedAt: false,
    });
    if (cartItem) {
      cartItem.quantityAdded += 1;
      cartItem.totalPrice += product.discountedPrice;
      await cartItem.save();
    } else {
      cartItem = new CartItem({
        userId,
        productId,
        quantityAdded: 1,
        totalPrice: product.discountedPrice,
        createdBy: userId,
      });
      await cartItem.save();
    }

    cart.quantityInCart += 1;
    cart.finalPrice += product.discountedPrice;
    await cart.save();

    return CommonHelper.ResponseSuccess(
      res,
      cartItem,
      HSC.OK,
      'Product added to cart successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR
    );
  }
};

const getCartItems = async (req: CartItemReq, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return CommonHelper.ResponseError(
        res,
        'User ID is required',
        HSC.BAD_REQUEST
      );
    }

    const cartItems = await CartItem.find({
      userId,
      deletedAt: false,
    }).populate('productId');

    if (!cartItems || cartItems.length < 1) {
      return CommonHelper.ResponseError(
        res,
        'No cart items found for the user',
        HSC.NOT_FOUND
      );
    }

    return CommonHelper.ResponseSuccess(
      res,
      cartItems,
      HSC.OK,
      'Cart items retrieved successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR
    );
  }
};

const removeCartItem = async (req: CartItemReq, res: Response) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id;

    if (!userId || !productId) {
      return CommonHelper.ResponseError(
        res,
        'User ID and productId are required',
        HSC.BAD_REQUEST
      );
    }

    const cartItem = await CartItem.findOne({
      productId: productId,
      userId,
      deletedAt: false,
    });
    if (!cartItem) {
      return CommonHelper.ResponseError(
        res,
        'Cart item not found',
        HSC.NOT_FOUND
      );
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return CommonHelper.ResponseError(res, 'Cart not found', HSC.NOT_FOUND);
    }

    cart.quantityInCart -= cartItem.quantityAdded;
    cart.finalPrice -= cartItem.totalPrice;
    await cart.save();

    const wishlistItem = await Wishlist.findOne({
      userId,
      productId,
    });
    if (!wishlistItem) {
      await Wishlist.create({
        userId,
        productId,
        createdBy: userId,
      });
    }

    await cartItem.deleteSoft();

    return CommonHelper.ResponseSuccess(
      res,
      null,
      HSC.OK,
      'Cart item removed and moved to wishlist successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR
    );
  }
};

const updateCartQuantity = async (req: CartItemReq, res: Response) => {
  try {
    const { productId, quantityAdded } = req.body;
    const userId = req.user?._id;

    if (!userId || !productId || quantityAdded <= 0) {
      return CommonHelper.ResponseError(
        res,
        'User ID, Product ID, and a valid quantity are required',
        HSC.BAD_REQUEST
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return CommonHelper.ResponseError(
        res,
        'Product not found',
        HSC.NOT_FOUND
      );
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return CommonHelper.ResponseError(res, 'Cart not found', HSC.NOT_FOUND);
    }

    const cartItem = await CartItem.findOne({
      userId,
      productId,
      deletedAt: false,
    });
    if (!cartItem) {
      return CommonHelper.ResponseError(
        res,
        'Cart item not found',
        HSC.NOT_FOUND
      );
    }

    const oldTotalPrice = cartItem.totalPrice;
    const newTotalPrice = product.discountedPrice * quantityAdded;
    const priceDifference = newTotalPrice - oldTotalPrice;
    const quantityDifference = quantityAdded - cartItem.quantityAdded;

    cartItem.quantityAdded = quantityAdded;
    cartItem.totalPrice = newTotalPrice;
    await cartItem.save();

    cart.quantityInCart += quantityDifference;
    cart.finalPrice += priceDifference;
    await cart.save();

    return CommonHelper.ResponseSuccess(
      res,
      cartItem,
      HSC.OK,
      'Cart item quantity updated successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR
    );
  }
};
const sendCartReminderEmail = async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const carts = await Cart.find({
      updatedAt: { $lte: oneHourAgo },
      deletedAt: false,
    }).lean();

    for (const cart of carts) {
      const cartItems = await CartItem.find({
        userId: cart.userId,
        deletedAt: false,
      }).populate('productId').lean();

      if (cartItems.length > 0) {
        const user = await User.findById(cart.userId);
        if (user) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST as string,
            port: process.env.SMTP_PORT || 2525,
            secure: process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER || 'focus_cleaning_staging',
              pass: process.env.SMTP_PASSWORD || 'JV569hCNhfHAYHmm',
            },
          } as TransportOptions);
          const mailOptions = {
            to: user.email,
            from: process.env.SMTP_FROM_EMAIL,
            subject: 'Reminder: Items in Your Cart',
            text: `You have items in your cart that haven't been purchased yet.`,
            html: `<p>Dear ${user.name},</p>
                   <p>You have items in your cart that haven't been purchased yet. Don't miss out on these items</p>
                   <p>Best regards,<br>Your Shop Team</p>`
          };

          transporter.sendMail(mailOptions, (err) => {
            if (err) {
              console.error('Error sending cart reminder email:', err);
            } else {
              console.log(`Reminder email sent to ${user.email}`);
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking for cart reminders:', error);
  }
};

cron.schedule('20 09 * * *', async () => {
  await sendCartReminderEmail();
});


export default {
  addToCart,
  getCartItems,
  removeCartItem,
  updateCartQuantity,
};
