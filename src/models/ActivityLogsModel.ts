/* eslint-disable @typescript-eslint/no-unsafe-call */
import mongoose, { Schema, Document, model } from 'mongoose';
import { ActivityLogsInterface } from '../types/model/ActivityLogs';

interface ActivityLogsModel extends ActivityLogsInterface, Document {}

const ActivityLogsSchema = new Schema<ActivityLogsModel>(
  {
    module: { type: String },
    moduleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    event: {
      type: String,
      enum: [
        'created',
        'updated',
        'listed',
        'viewed',
        'deleted',
        'imported',
        'exported',
        'removed',
        'login',
        'logout',
      ],
    },
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    deletedAt: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ActivityLogsSchema.methods.deleteSoft = async function (): Promise<void> {
  this.deletedAt = true;
  await this.save();
};

ActivityLogsSchema.pre('find', function () {
  this.where({ deletedAt: false });
});
ActivityLogsSchema.pre('findOne', function () {
  this.where({ deletedAt: false });
});

ActivityLogsSchema.pre(/exists/, function (this: any) {
  this.where({ deletedAt: false });
});

const ActivityLogs = model<ActivityLogsModel>(
  'ActivityLogs',
  ActivityLogsSchema,
);

export { ActivityLogs, ActivityLogsModel };
