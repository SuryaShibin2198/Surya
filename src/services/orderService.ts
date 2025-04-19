import { Request, Response } from 'express';
import { OrderReq } from '../types/orderTypes';
import CommonHelper from '../helpers/CommonHelper';
import CartItem from '../models/cartItemModel';
import { Product } from '../models/productModel';
import Cart from '../models/cartModel';
import { CommonError, Query, SortQuery } from '../types/common/common';
import HSC from '../constants/HttpStatusCodes';
import Order from '../models/orderModel';
import OrderItem from '../models/orderItemModel';
import nodemailer, { TransportOptions } from 'nodemailer';
import User from '../models/userModel';
import PDFDocument from 'pdfkit';
import Pincode from '../models/pincodeModels';
import mongoose, { Aggregate } from 'mongoose';
import { Validator } from 'node-input-validator';
import Coupon from '../models/couponModel';
import Offer from '../models/offerModel';
import { io } from '../app';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import admin from './../config/firebaseAdmin';
const placeOrder = async (req: OrderReq, res: Response) => {
  try {
    const { couponCode, offerCode } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return CommonHelper.ResponseError(
        res,
        'User ID is required',
        HSC.BAD_REQUEST
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return CommonHelper.ResponseError(res, 'User not found', HSC.NOT_FOUND);
    }
    const pincodeData = await Pincode.findOne({
      pincode: user.pincode,
      deletedAt: false,
    });
    if (!pincodeData) {
      return CommonHelper.ResponseError(
        res,
        'Pincode not found',
        HSC.NOT_FOUND
      );
    }

    if (!pincodeData.deliverable) {
      return CommonHelper.ResponseError(
        res,
        'Delivery not available for this pincode',
        HSC.BAD_REQUEST
      );
    }

    const calculateExpectedDeliveryDate = (deliveryDays: number) => {
      let expectedDate = new Date();
      while (deliveryDays > 0) {
        expectedDate.setDate(expectedDate.getDate() + 1);
        if (expectedDate.getDay() !== 0 && expectedDate.getDay() !== 6) {
          deliveryDays--;
        }
      }
      return expectedDate;
    };

    const expectedDeliveryDate = calculateExpectedDeliveryDate(
      pincodeData.deliveryDays
    );

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return CommonHelper.ResponseError(res, 'Cart not found', HSC.NOT_FOUND);
    }

    const totalAmount = cart.finalPrice;
    const cartItems = await CartItem.find({ userId, deletedAt: false });

    if (cartItems.length === 0) {
      return CommonHelper.ResponseError(res, 'Cart is empty', HSC.BAD_REQUEST);
    }

    let calculatedTotalAmount = 0;
    for (const item of cartItems) {
      calculatedTotalAmount += item.totalPrice;
    }

    let finalTotalAmount = calculatedTotalAmount;
    let couponDiscount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });

      if (!coupon) {
        return CommonHelper.ResponseError(
          res,
          'Invalid coupon code',
          HSC.BAD_REQUEST
        );
      }

      if (coupon.expiryDate < new Date()) {
        return CommonHelper.ResponseError(
          res,
          'Coupon has expired',
          HSC.BAD_REQUEST
        );
      }

      if (coupon.usageCount >= coupon.usageLimit) {
        return CommonHelper.ResponseError(
          res,
          'Coupon usage limit exceeded',
          HSC.BAD_REQUEST
        );
      }

      couponDiscount = (coupon.discount / 100) * calculatedTotalAmount;
      finalTotalAmount = calculatedTotalAmount - couponDiscount;

      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } });
    }
    if (offerCode) {
      const offer = await Offer.findOne({ offerCode: offerCode });

      if (!offer) {
        return CommonHelper.ResponseError(
          res,
          'Invalid offer code',
          HSC.BAD_REQUEST
        );
      }

      if (offer.endDate < new Date()) {
        return CommonHelper.ResponseError(
          res,
          'Offer has expired',
          HSC.BAD_REQUEST
        );
      }

      if (calculatedTotalAmount < offer.priceRange) {
        return CommonHelper.ResponseError(
          res,
          `Total amount must be at least ${offer.priceRange} to apply this offer`,
          HSC.BAD_REQUEST
        );
      }
      const offerDiscount =
        (offer.offerPercentage / 100) * calculatedTotalAmount;
      finalTotalAmount = calculatedTotalAmount - offerDiscount;

      await Offer.findByIdAndUpdate(offer._id, { $inc: { usageCount: 1 } });
    }
    if (couponCode && offerCode) {
      return CommonHelper.ResponseError(
        res,
        'Only one discount code (coupon or offer) can be applied',
        HSC.BAD_REQUEST
      );
    }
    const order = new Order({
      userId,
      totalAmount: finalTotalAmount,
      couponApplied: couponCode ? true : false,
      offerApplied: offerCode ? true : false,
      couponDiscount,
      expectedDeliveryDate,
      createdBy: userId,
    });
    await order.save();

    for (const item of cartItems) {
      const orderItem = new OrderItem({
        orderId: order._id,
        productId: item.productId,
        quantity: item.quantityAdded,
        price: item.totalPrice,
        createdBy: userId,
      });
      await orderItem.save();

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantityAdded },
      });
    }

    await CartItem.updateMany(
      { userId, deletedAt: false },
      { deletedAt: true }
    );

    await Cart.findOneAndUpdate(
      { userId },
      { quantityInCart: 0, finalPrice: 0 }
    );

    io.emit('orderPlaced', {
      message: 'Order placed successfully',
      orderId: order._id,
      totalAmount: finalTotalAmount,
      expectedDeliveryDate,
    });
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    client.messages
      .create({
        body: `Your order has been placed successfully. Order ID: ${order._id}, Total: ${finalTotalAmount}`,
        from: process.env.TWILIO_PHONE_NUMBER, 
        to: user.mobileNumber.startsWith('+') ? user.mobileNumber : `${user.mobileNumber}`,
      })
      .then((message: MessageInstance) => console.log(`SMS sent with SID: ${message.sid}`))
      .catch((err: Error) => console.error('Error sending SMS:', err));

    const doc = new PDFDocument();
    let buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST as string,
        port: process.env.SMTP_PORT || 2525,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER || 'focus_cleaning_staging',
          pass: process.env.SMTP_PASSWORD || 'JV569hCNhfHAYHmm',
        },
      } as TransportOptions);
      const user = await User.findById(userId);
      
      if (!user) {
        return CommonHelper.ResponseError(res, 'User not found', HSC.NOT_FOUND);
      }

      const mailOptions = {
        to: user.email,
        from: process.env.SMTP_FROM_EMAIL,
        subject: 'Order Placed',
        text: `Order Placed Successfully.`,
        attachments: [
          {
            filename: 'order.pdf',
            content: pdfData,
          },
        ],
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error('Error sending order confirmation email:', err);
          return res
            .status(500)
            .json({ error: 'Failed to send order confirmation email' });
        }
        return res
          .status(200)
          .json({ message: 'Order confirmation email sent' });
      });
    });

    doc.fontSize(20).text('Order Confirmation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order ID: ${order._id}`);
    doc.text(`Total Amount: ${finalTotalAmount}`);
    doc.text(`Expected Delivery Date: ${expectedDeliveryDate.toDateString()}`);
    doc.moveDown();
    doc.text('Order Items:');
    cartItems.forEach((item, index) => {
      doc.text(
        `Item ${index + 1}: Product ID: ${item.productId}, Quantity: ${item.quantityAdded}, Price: ${item.totalPrice}`
      );
    });

    doc.end();
    return CommonHelper.ResponseSuccess(
      res,
      order,
      HSC.OK,
      'Order placed successfully'
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

const cancelOrder = async (req: OrderReq, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!id || !userId) {
      return CommonHelper.ResponseError(
        res,
        'Order ID and User ID are required',
        HSC.BAD_REQUEST
      );
    }

    const order = await Order.findOne({ _id: id, userId, deletedAt: false });
    if (!order) {
      return CommonHelper.ResponseError(res, 'Order not found', HSC.NOT_FOUND);
    }

    const orderItems = await OrderItem.find({
      orderId: order._id,
      deletedAt: false,
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
      await OrderItem.findByIdAndUpdate(item._id, { deletedAt: true });
    }

    order.deletedAt = true;
    await order.save();
    
    const userFirebaseToken = req.user?.firebaseToken;

    if (!userFirebaseToken) {
      console.warn('No Firebase token available for user');
    } else {
      const message = {
        notification: {
          title: 'Order Cancelled',
          body: `Your order with ID ${id} has been cancelled.`,
        },
        token: userFirebaseToken, 
      };

      await admin.messaging().send(message);
    }
    return CommonHelper.ResponseSuccess(
      res,
      null,
      HSC.OK,
      'Order cancelled successfully'
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
const populateField = (
  data: Aggregate<Document[]>,
  fieldName: string,
  localField: string
) => {
  data.lookup({
    from: fieldName,
    localField: localField,
    foreignField: '_id',
    as: localField,
    pipeline: [
      {
        $project: {
          value: '$_id',
          label: '$name',
          code: 1,
        },
      },
    ],
  });
};

const getAll = async (req: OrderReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;
    const query: Query = {};

    const Page = page ? parseInt(page as string, 10) : 0;
    const pageSizeValue = pageSize ? parseInt(pageSize as string, 10) : 10;

    const data: Aggregate<Document[]> = Order.aggregate();

    if (search) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'orderItems.productId': { $regex: search, $options: 'i' } },
      ];
      data.match(query);
    }
    data.lookup({
      from: 'orderitems',
      localField: '_id',
      foreignField: 'orderId',
      as: 'orderItems',
    });
    data.unwind({ path: '$orderItems', preserveNullAndEmptyArrays: true });
    data.lookup({
      from: 'products',
      localField: 'orderItems.productId',
      foreignField: '_id',
      as: 'orderItems.productDetails',
    });

    data.unwind({
      path: '$orderItems.productDetails',
      preserveNullAndEmptyArrays: true,
    });
    const Sort = sort ? sort : 'desc';
    const Field = field ? field : 'createdAt';
    const validator_ = new Validator(
      { Sort, Field },
      {
        Sort: 'nullable|string|in:asc,desc',
        Field: 'nullable|string|in:code,name,createdAt',
      }
    );

    if (await validator_.fails()) {
      console.error('Validation Errors:', validator_.errors);
      return CommonHelper.ResponseError(
        res,
        validator_.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error'
      );
    }

    if (query.$or) {
      data.match({ $or: query.$or });
    }

    const sortQuery: SortQuery = {};
    sortQuery[Field] = Sort === 'asc' ? 1 : -1;
    data.project({
      _id: 1,
      userId: 1,
      totalAmount: 1,
      status: 1,
      createdAt: 1,
      orderItems: 1,
    });

    const countResult: { totalCount: number }[] = await Order.aggregate<{
      totalCount: number;
    }>([...data.pipeline(), { $count: 'totalCount' }]).exec();
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;

    const result = await data
      .skip(Page * pageSizeValue)
      .sort(sortQuery)
      .limit(pageSizeValue)
      .exec();

    const totalPages = Math.ceil(total / pageSizeValue);

    return CommonHelper.ResponseSuccess(
      res,
      {
        list: result,
        total,
        page: Page,
        pageSize: pageSizeValue,
        totalPages,
      },
      HSC.OK,
      'Order list fetched successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const getOne = async (req: OrderReq, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return CommonHelper.ResponseError(
        res,
        'Order ID is required',
        HSC.BAD_REQUEST
      );
    }

    const data: Aggregate<Document[]> = Order.aggregate();

    data.match({ _id: new mongoose.Types.ObjectId(id) });

    data.lookup({
      from: 'orderitems',
      localField: '_id',
      foreignField: 'orderId',
      as: 'orderItems',
    });

    data.unwind({ path: '$orderItems', preserveNullAndEmptyArrays: true });

    data.lookup({
      from: 'products',
      localField: 'orderItems.productId',
      foreignField: '_id',
      as: 'orderItems.productDetails',
    });

    data.unwind({
      path: '$orderItems.productDetails',
      preserveNullAndEmptyArrays: true,
    });

    data.match({ deletedAt: false });

    data.project({
      _id: 1,
      userId: 1,
      totalAmount: 1,
      status: 1,
      createdAt: 1,
      orderItems: {
        _id: 1,
        orderId: 1,
        productId: 1,
        quantity: 1,
        price: 1,
        productDetails: {
          _id: 1,
          name: 1,
          code: 1,
          categoryId: 1,
          subCategoryId: 1,
          quantity: 1,
          inStock: 1,
          originalPrice: 1,
          discountedPrice: 1,
          deletedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    });

    const result = await data.exec();

    if (result.length === 0) {
      return CommonHelper.ResponseError(res, 'Order not found', HSC.NOT_FOUND);
    }

    return CommonHelper.ResponseSuccess(
      res,
      result[0],
      HSC.OK,
      'Order fetched successfully'
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

const pushNotification = async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Valid message is required' });
  }

  try {
    // Emit notification event
    io.emit('notification', { message });
    return res.status(200).json({ success: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    const e = error as unknown as CommonError;

    return res.status(500).json({ success: false, message: 'Unsuccess', error: e.message });
  }
};
export default {
  placeOrder,
  cancelOrder,
  getAll,
  getOne,
  pushNotification
} as const;
