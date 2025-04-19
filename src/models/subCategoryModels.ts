import mongoose, { Schema, Document, model } from 'mongoose';
import { SubCategoryInterface } from '../types/model';

interface SubCategoryModel extends SubCategoryInterface, Document {}

const SubCategorySchema = new Schema<SubCategoryModel>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    status: { type: Boolean, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    deletedAt: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);
SubCategorySchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};
SubCategorySchema.pre('find', function () {
  this.where({ deletedAt: false });
});

SubCategorySchema.pre('findOne', function () {
  this.where({ deletedAt: false });
});
SubCategorySchema.pre(/exists/, function (this: any) {
  this.where({ deletedAt: false });
});

const SubCategory = model<SubCategoryModel>('SubCategory', SubCategorySchema);

export { SubCategory, SubCategoryModel };
