import { Request } from 'express';
import mongoose, { ObjectId } from 'mongoose';

export interface productReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: productReqBody;
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

interface productReqBody {
  id: boolean;
  name: string;
  code: string;
  categoryId: { value: ObjectId };
  subCategoryId: { value: ObjectId };
  quantity: number;
  inStock: boolean;
  originalPrice: number;
  discountedPrice: number;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}
