import { ObjectId } from 'mongoose';

export interface JwtCustomRequest extends Request {
  user?: {
    _id: ObjectId;
    name: string;
    email: string;
    accessToken: string;
  };
}
