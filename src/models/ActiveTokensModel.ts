import mongoose, { Schema } from 'mongoose';
import { activeTokenDocument } from '../types/model/IActiveTokens';

const activeTokenSchema: Schema<activeTokenDocument> =
  new Schema<activeTokenDocument>({
    email: {
      type: Schema.Types.String,
      ref: 'User',
      required: true,
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
  });

export default mongoose.model<activeTokenDocument>(
  'ActiveToken',
  activeTokenSchema,
);
