import { Request } from 'express';
import mongoose, { ObjectId } from 'mongoose';

export interface WishlistReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: wishlistRequestBody;
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

interface wishlistRequestBody {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  deletedAt: boolean;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}
