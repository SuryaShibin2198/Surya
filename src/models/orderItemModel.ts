import mongoose, { model, Schema } from 'mongoose';
import { OrderItemInterface } from '../types/model';
import { Document } from 'mongoose';

export interface orderItemModel extends OrderItemInterface, Document {}

const OrderItemSchema = new Schema<OrderItemInterface>({
  orderId: { type: mongoose.Types.ObjectId, required: true, ref: 'Order' },
  productId: { type: mongoose.Types.ObjectId, required: true, ref: 'Product' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  deletedAt: { type: Boolean, default: false },
  createdBy: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  updatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
});

OrderItemSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};
const OrderItem = model<OrderItemInterface>('OrderItem', OrderItemSchema);

export default OrderItem;
