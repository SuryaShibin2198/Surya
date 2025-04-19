import mongoose from 'mongoose';

export interface SortQuery {
  [key: string]: 1 | -1;
}

export interface RegexQuery {
  [key: string]: { $regex: RegExp };
}

export interface SearchQuery {
  $or?: RegexQuery[];
}

export interface CommonError {
  keyValue: boolean;
  keyPattern: boolean;
  code: number;
  message?: string;
  name?: string;
}
export interface UniqueQuery {
  text?: string | number;
  barcode?: string | number;
  SKU?: string | number;
  deletedAt?: boolean;
}

export interface Query {
  [key: string]: any;
  $or?: any[];
}
export interface FilterQuery {
  [key: string]: { $in: mongoose.Types.ObjectId[] };
}

export interface DateFilter {
  [key: string]: { $gte?: Date; $lte?: Date };
}

export interface ErrorRes {
  [key: string]: ValidationError[];
}

interface ValidationError {
  message: string;
  field: string;
}

export interface multerData {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}
