import { Request } from 'express';
import mongoose, { ObjectId } from 'mongoose';

export interface CartReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: CartRequestBody;
  params: {
    id: string;
  };
  query: {
    search: string;
    pageSize: string;
    page: string;
    sort: string;
    field: string;
  };
}

interface CartRequestBody {
  userId: mongoose.Types.ObjectId;
  quantityInCart: number;
  finalPrice: number;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}

export interface CartItemReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: CartItemRequestBody;
  params: {
    id: string;
  };
  query: {
    search: string;
    pageSize: string;
    page: string;
    sort: string;
    field: string;
  };
}

interface CartItemRequestBody {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantityAdded: number;
  totalPrice: number;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}
