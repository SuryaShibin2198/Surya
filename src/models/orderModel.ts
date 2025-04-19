import mongoose, { Schema, Document, model } from 'mongoose';
import { OrderInterface } from '../types/model';

export interface orderModel extends OrderInterface, Document {}

const OrderSchema = new Schema<OrderInterface>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  deletedAt: { type: Boolean, default: false },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

OrderSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};
const Order = model<OrderInterface>('Order', OrderSchema);

export default Order;
