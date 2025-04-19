import mongoose, { Document, model, Schema } from 'mongoose';
import { WishlistInterface } from '../types/model';

interface wishlistModel extends WishlistInterface, Document {}

const wishlistSchema = new Schema<wishlistModel>(
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
    deletedAt: { type: Boolean, required: true, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
wishlistSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};

const Wishlist = model<wishlistModel>('Wishlist', wishlistSchema);

export { Wishlist, wishlistModel };
