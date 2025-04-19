import { Request as Request } from 'express';
import { ObjectId } from 'mongoose';

interface CategoryReq extends Request {
  user?: {
    _id: ObjectId;
    name: string;
  };
  body: {
    code: string;
    name: string;
    status: boolean;
    ids: string[];
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

export { CategoryReq };
