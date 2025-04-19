import { Request as Request } from 'express';
import { ObjectId } from 'mongoose';

interface PincodeReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: {
    pincode: number;
    deliveryDays: number;
    deliverable: boolean;
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

export { PincodeReq };
