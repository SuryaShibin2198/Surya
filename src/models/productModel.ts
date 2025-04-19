  import mongoose, { Document, model, Schema } from 'mongoose';
  import { ProductInterface } from '../types/model';

  interface productModel extends ProductInterface, Document {}

  const productShema = new Schema<productModel>(
    {
      name: { type: String, required: true },
      code: { type: String, required: true },
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Category',
      },
      subCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'SubCategory',
      },
      quantity: { type: Number, required: true },
      inStock: { type: Boolean, required: true },
      originalPrice: { type: Number, required: true },
      discountedPrice: { type: Number, required: true },
      deletedAt: { type: Boolean, required: true, default: false },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );
  productShema.methods.deleteSoft = async function (): Promise<void> {
    this.deletedAt = true;
    await this.save();
  };
  productShema.pre('find', function () {
    this.where({ deletedAt: false });
  });

  productShema.pre('findOne', function () {
    this.where({ deletedAt: false });
  });
  productShema.pre(/exists/, function (this: any) {
    this.where({ deletedAt: false });
  });

  const Product = model<productModel>('Product', productShema);

  export { Product, productModel };
