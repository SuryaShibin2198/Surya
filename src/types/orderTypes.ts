import { Request } from 'express';
import mongoose, { ObjectId } from 'mongoose';

export interface OrderReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
    firebaseToken?: string;
  };
  body: OrderRequestBody;
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

interface OrderRequestBody {
  userId: mongoose.Types.ObjectId;
  totalAmount: number;
  couponCode?: string;
  offerCode?: string;
  status: string;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}

export interface OrderItemReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: OrderItemRequestBody;
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

interface OrderItemRequestBody {
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}
