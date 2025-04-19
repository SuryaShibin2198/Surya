import mongoose, { model, Schema } from 'mongoose';
import { CartItemInterface } from '../types/model';

export interface CartItemModel extends Document, CartItemInterface {}

const CartItemSchema = new Schema<CartItemModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantityAdded: { type: Number, required: true, default: 1 },
    totalPrice: { type: Number, required: true, default: 0 },
    deletedAt: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

CartItemSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};

const CartItem = model<CartItemModel>('CartItem', CartItemSchema);

export default CartItem;
