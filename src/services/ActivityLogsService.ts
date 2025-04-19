import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Service from '../helpers/CommonHelper';
import HSC from '../constants/HttpStatusCodes';
import { ActivityLogs } from '../models/ActivityLogsModel';
import { CommonError } from '../types/common/common';
export async function list(request: Request, response: Response) {
  try {
    const result = await ActivityLogs.find()
      .populate({
        path: 'doneBy',
        select: '_id username',
      })
      .select('_id module event');
    return Service.ResponseSuccess(
      response,
      result,
      HSC.OK,
      'Activity log listed.',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return Service.ResponseError(response, e.message, HSC.BAD_REQUEST);
  }
}

export async function create(
  module: string,
  moduleId: mongoose.Schema.Types.ObjectId | null,
  event: string,
  doneBy: mongoose.Schema.Types.ObjectId,
  message: string,
) {
  try {
    return await ActivityLogs.create({
      module,
      moduleId,
      event,
      doneBy,
      message,
    });
  } catch (error) {
    const e = error as CommonError;
    throw new Error(e.message);
  }
}
