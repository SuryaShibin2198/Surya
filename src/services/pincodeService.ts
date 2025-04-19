import { Response } from 'express';
import { PincodeReq } from '../types/pincodeTypes';
import CommonHelper from '../helpers/CommonHelper';
import Pincode from '../models/pincodeModels';
import HSC from '../constants/HttpStatusCodes';
import { CommonError, Query, SortQuery } from '../types/common/common';
import mongoose, { Aggregate } from 'mongoose';
import { Validator } from 'node-input-validator';

const add = async (req: PincodeReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can add pincodes',
      );
    }
    const { pincode, deliveryDays, deliverable } = req.body;
    const pincodedata = await Pincode.create({
      pincode,
      deliveryDays,
      deliverable,
      createdBy: req.user?._id,
    });

    return CommonHelper.ResponseSuccess(
      res,
      { pincodedata },
      HSC.OK,
      'Pincode created successfully',
    );
  } catch (error) {
    const e = error as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const update = async (req: PincodeReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can update pincodes',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Invalid ID', HSC.NOT_FOUND);
    }

    const { pincode, deliveryDays, deliverable } = req.body;

    const updatedPincode = await Pincode.findByIdAndUpdate(
      id,
      { pincode, deliveryDays, deliverable, updatedBy: req.user?._id },
      { new: true },
    );

    if (!updatedPincode) {
      return CommonHelper.ResponseError(
        res,
        'Pincode not found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      updatedPincode,
      HSC.OK,
      'Pincode updated successfully',
    );
  } catch (error) {
    console.error('Error in update:', error);
    return CommonHelper.ResponseError(
      res,
      'Internal Server Error',
      HSC.INTERNAL_SERVER_ERROR,
    );
  }
};

const getAll = async (req: PincodeReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;

    const query: Query = {};
    if (typeof search === 'string' && search) {
      query.$or = [{ pincode: { $regex: search, $options: 'i' } }];
    }

    const Page = page ? parseInt(page, 10) : 0;
    const pagesize = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = Pincode.aggregate();

    // Sorting
    const Sort = sort ? sort : 'desc';
    const Field = field ? field : 'createdAt';
    const validator_ = new Validator(
      { Sort, Field },
      {
        Sort: 'nullable|string|in:asc,desc',
        Field: 'nullable|string|in:code,name,createdAt',
      },
    );

    if (await validator_.fails()) {
      console.error('Validation Errors:', validator_.errors);
      return CommonHelper.ResponseError(
        res,
        validator_.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error',
      );
    }

    if (query.$or) {
      data.match({ $or: query.$or });
    }

    const sortQuery: SortQuery = {};
    sortQuery[Field] = Sort === 'asc' ? 1 : -1;

    const countResult: { totalCount: number }[] = await Pincode.aggregate<{
      totalCount: number;
    }>([...data.pipeline(), { $count: 'totalCount' }]).exec();
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;
    const pincodes = await Pincode.find(query)
      .select('code name status')
      .limit(pagesize)
      .skip(Page * pagesize)
      .sort(sortQuery)
      .exec();

    const totalPages = Math.ceil(total / pagesize);
    return CommonHelper.ResponseSuccess(
      res,
      {
        list: pincodes,
        total: total,
        page: Page,
        pageSize: pagesize,
        totalPages,
      },
      HSC.OK,
      'Pincode List successfully retrieved',
    );
  } catch (error) {
    console.error('Error in getAll:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const getOne = async (req: PincodeReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const pincode = await Pincode.findOne({ _id: id }).select(
      '_id name code status',
    );
    if (!pincode) {
      return CommonHelper.ResponseError(
        res,
        'pincode not found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      pincode,
      HSC.OK,
      'pincode data retrieved successfully',
    );
  } catch (error) {
    console.error('Error in getOne:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const Delete = async (req: PincodeReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can delete pincodes',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const pincode = await Pincode.findById(id);
    if (!pincode) {
      return CommonHelper.ResponseError(
        res,
        'pincode not found',
        HSC.NOT_FOUND,
      );
    }
    await pincode.deleteSoft();

    return CommonHelper.ResponseSuccess(res, [], HSC.OK, 'pincode deleted ');
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

export default {
  getAll,
  getOne,
  add,
  update,
  Delete,
} as const;
