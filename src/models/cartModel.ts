import mongoose, { model, Schema } from 'mongoose';
import { CartInterface } from '../types/model';
import { Document } from 'mongoose';

export interface CartModel extends CartInterface, Document {}

const CartSchema = new Schema<CartModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    quantityInCart: { type: Number, required: true, default: 0 },
    finalPrice: { type: Number, required: true, default: 0 },
    deletedAt: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

CartSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};

const Cart = model<CartModel>('Cart', CartSchema);

export default Cart;
