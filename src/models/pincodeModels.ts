import mongoose, { Schema, model, Document } from 'mongoose';
import { PincodeInterface } from '../types/model';

interface PincodeModel extends PincodeInterface, Document {}

const PincodeSchema = new Schema<PincodeModel>(
  {
    pincode: { type: Number, required: true, unique: true },
    deliveryDays: { type: Number, required: true },
    deliverable: { type: Boolean, required: true },
    deletedAt: { type: Boolean, required: true, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

PincodeSchema.methods.deleteSoft = async function (
  this: PincodeModel,
): Promise<void> {
  this.deletedAt = true;
  await this.save();
};

const Pincode = model<PincodeModel>('Pincode', PincodeSchema);

export default Pincode;
