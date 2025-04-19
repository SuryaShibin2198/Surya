import HttpStatusCodes from '../constants/HttpStatusCodes';
import User from '../models/userModel';
import { Response } from 'express';
import { ObjectId } from 'mongoose';
import { create as logActivity } from '../services/ActivityLogsService';
import { CommonError } from '../types/common/common';
interface ErrorMessage {
  message: string;
  rule: string;
}
function CustomMessage(
  errors: Record<string, ErrorMessage>,
): Record<string, ErrorMessage> {
  try {
    const error_msg: Record<string, ErrorMessage> = {};
    for (const key in errors) {
      // let split_key = key.split('.')[0];
      // if (key.split('.')[1]) split_key = split_key + key.split('.')[1];
      const temp_key_array = key.split('.');
      let temp_key = 0;
      let temp_check = true;
      do {
        const pop_data = temp_key_array.pop() || '0';
        if (!isNaN(parseInt(pop_data))) {
          temp_check = false;
          temp_key = parseInt(pop_data);
        }
      } while (temp_check);
      error_msg[key] = {
        message: errors[key].message.replace(
          ':key',
          numberToOrdinal(temp_key + 1),
        ),
        rule: errors[key].rule,
      };
    }
    return error_msg;
  } catch (error) {
    const e = error as unknown as CommonError;
    throw new Error(e.message);
  }
}

function numberToOrdinal(number: number) {
  let suffix = 'th';
  if (number % 100 < 11 || number % 100 > 13) {
    switch (number % 10) {
      case 1:
        suffix = 'st';
        break;
      case 2:
        suffix = 'nd';
        break;
      case 3 || 100:
        suffix = 'rd';
        break;
    }
  }
  return number + suffix;
}

interface User {
  name: string;
  _id: ObjectId;
}

interface RequestBody {
  name: string;
}

export const ResponseSuccess = async <T>(
  response: Response,
  data: T,
  status: HttpStatusCodes,
  message: string | string[] = 'success',
  user?: User,
  reqBody?: RequestBody,
  userId?: ObjectId,
) => {
  if (user && reqBody) {
    const userName = `${user.name.charAt(0).toUpperCase()}${user.name.slice(1)}`;
    const secondName = `${reqBody.name.charAt(0).toLowerCase()}${reqBody.name.slice(1)}`;
    await logActivity(
      'UserRoleParent',
      userId ?? null,
      'created',
      user?._id ?? null,
      `${userName} has created ${secondName} parent module.`,
    );
  }

  return response
    .status(status)
    .json({
      success: true,
      message,
      data,
    })
    .end();
};

const ResponseError = (
  response: Response,
  error: any,
  status: HttpStatusCodes,
  message: string = 'unsuccess',
) => {
  return response.status(status).json({ success: false, message, error }).end();
};

export default {
  CustomMessage,
  ResponseSuccess,
  ResponseError,
} as const;
