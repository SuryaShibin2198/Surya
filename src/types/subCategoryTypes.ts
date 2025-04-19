import { Request, Response } from 'express';
import mongoose, { ObjectId } from 'mongoose';

export interface SubCategoryReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: {
    name: string;
    categoryId: {
      value: mongoose.Schema.Types.ObjectId | null;
    };
    code: string;
    status: boolean;
    ids: string[];
  };
  params: {
    id: string;
  };
  query: {
    search: string;
    page: string;
    pageSize: string;
    sort: string;
    field: string;
  };
}
