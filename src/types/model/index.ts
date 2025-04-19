import mongoose from 'mongoose';

export interface CategoryInterface {
  code: string;
  name: string;
  status: boolean;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface SubCategoryInterface {
  name: string;
  code: string;
  categoryId: mongoose.Schema.Types.ObjectId | null;
  status: boolean;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface ProductInterface {
  name: string;
  code: string;
  categoryId: mongoose.Schema.Types.ObjectId;
  subCategoryId: mongoose.Schema.Types.ObjectId;
  quantity: number;
  inStock: boolean;
  originalPrice: number;
  discountedPrice: number;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface WishlistInterface {
  userId: mongoose.Schema.Types.ObjectId;
  productId: mongoose.Schema.Types.ObjectId;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface CartInterface {
  userId: mongoose.Schema.Types.ObjectId;
  quantityInCart: number;
  finalPrice: number;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface CartItemInterface {
  userId: mongoose.Schema.Types.ObjectId;
  productId: mongoose.Schema.Types.ObjectId;
  quantityAdded: number;
  totalPrice: number;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface OrderInterface {
  userId: mongoose.Schema.Types.ObjectId;
  totalAmount: number;
  status: string;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface OrderItemInterface {
  orderId: mongoose.Schema.Types.ObjectId;
  productId: mongoose.Schema.Types.ObjectId;
  quantity: number;
  price: number;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface CouponInterface {
  code: string;
  discount: number;
  expiryDate: Date;
  usageLimit: number;
  usageCount: number;
  description?: string;
  status?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PincodeInterface {
  pincode: number;
  deliveryDays: number;
  deliverable: boolean;
  deletedAt: boolean;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}

export interface OfferInterface{
  offerName: string;
  startDate: Date;
  endDate: Date;
  offerPercentage: number;
  categoryName: mongoose.Schema.Types.ObjectId;
  priceRange: number;
  offerCode: string;
  createdBy: mongoose.Schema.Types.ObjectId;
  updatedBy: mongoose.Schema.Types.ObjectId;
  deleteSoft(): Promise<void>;
}