import { Request } from 'express';
import mongoose, { ObjectId } from 'mongoose';

interface OfferReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: {
    offerName: string;
    startDate: Date;
    endDate: Date;
    offerPercentage: number;
    categoryName: mongoose.Schema.Types.ObjectId;
    priceRange: number;
    offerCode: string;
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

export { OfferReq };
