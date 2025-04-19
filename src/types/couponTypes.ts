import { Request } from 'express';
import { ObjectId } from 'mongoose';

interface CouponReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: {
    code: string;
    discount: number;
    expiryDate: Date;
    usageLimit: number;
    description?: string;
    status?: boolean;
  };
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

export { CouponReq };
