import { Document } from 'mongoose';

export interface activeTokenDocument extends Document {
  email: string;
  accessToken: string;
  refreshToken: string;
}
