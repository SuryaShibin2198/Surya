import mongoose, { Schema, model, Document } from 'mongoose';
import { CategoryInterface } from '../types/model';
import { SubCategory } from './subCategoryModels';

interface CategoryModel extends CategoryInterface, Document {}

const CategorySchema = new Schema<CategoryModel>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: Boolean, required: true },
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

CategorySchema.methods.deleteSoft = async function (
  this: CategoryModel,
): Promise<void> {
  const subCategroyexists = await SubCategory.findOne({ categoryId: this._id });
  if (subCategroyexists) {
    throw new Error(
      'Cannot delete this category because related sub category exists',
    );
  }
  this.deletedAt = true;
  await this.save();
};

CategorySchema.pre('find', function () {
  this.where({ deletedAt: false });
});

CategorySchema.pre('findOne', function () {
  this.where({ deletedAt: false });
});

CategorySchema.pre(/exists/, function (this: any) {
  this.where({ deletedAt: false });
});

const Category = model<CategoryModel>('Category', CategorySchema);

export default Category;
