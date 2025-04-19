import { Schema, Document, model } from 'mongoose';
import { CouponInterface } from '../types/model';

interface CouponModel extends CouponInterface, Document {}

const couponSchema = new Schema<CouponModel>({
  code: { type: String, required: true, unique: true },
  discount: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  usageCount: { type: Number, default: 0 },
  description: { type: String },
  status: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Coupon = model<CouponModel>('Coupon', couponSchema);

export default Coupon;
