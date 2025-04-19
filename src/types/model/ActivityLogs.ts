import mongoose, { Document } from 'mongoose';

export interface ActivityLogsInterface extends Document {
  module: string;
  moduleId: mongoose.Schema.Types.ObjectId | null;
  event: string;
  doneBy: mongoose.Schema.Types.ObjectId;
  message: string;
  deletedAt: boolean;
  deleteSoft(): Promise<void>;
}
