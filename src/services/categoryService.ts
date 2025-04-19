import mongoose, { Aggregate, ObjectId, Types } from 'mongoose';
import { CategoryReq } from '../types/categoryTypes';
import Category from '../models/categoryModel';
import { Validator } from 'node-input-validator';
import HSC from '../constants/HttpStatusCodes';
import CommonHelper from '../helpers/CommonHelper';
import { Response } from 'express';
import { create } from './ActivityLogsService';
import { CommonError, Query, SortQuery } from '../types/common/common';

const add = async (req: CategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only Admins Can Add Categories',
      );
    }
    const category = new Validator(
      req.body,
      {
        name: 'required|unique:Category,name,NULL',
        code: 'required|unique:Category,code,NULL',
        status: 'required',
      },
      {
        'name.required': 'Category Name Is Required',
        'code.required': 'Category Code Is Required',
        'name.unique': 'Category Name Is Already Taken',
        'code.unique': 'Category Code Is Already Taken',
      },
    );
    if (await category.fails()) {
      return CommonHelper.ResponseError(
        res,
        category.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error',
      );
    }
    const { name, code, status } = req.body;
    const categorydata = await Category.create({
      name,
      code,
      status,
      createdBy: req.user?._id,
    });

    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'Category',
      categorydata._id as ObjectId,
      'created',
      req.user?._id as ObjectId,
      `${userName} has created ${secondName} category.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      {
        essential: {
          label: categorydata.name,
          value: categorydata._id as ObjectId,
        },
      },
      HSC.OK,
      'Category Created Successfully',
    );
  } catch (error) {
    const e = error as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const update = async (req: CategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only Admins Can Update Categories',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Invalid ID', HSC.NOT_FOUND);
    }

    const { code, name, status } = req.body;
    const validationRules = {
      name: 'required|unique:Category,name,' + id,
      code: 'required|unique:Category,code,' + id,
      status: 'required',
    };
    const customMessages = {
      'name.required': 'Category Name Is Required',
      'code.required': 'Category Code Is Required',
      'name.unique': 'Category Name Is Already Taken',
      'code.unique': 'Category Code Is Already Taken',
    };
    const categoryValidator = new Validator(
      req.body,
      validationRules,
      customMessages,
    );

    if (await categoryValidator.fails()) {
      console.error('Validation Errors:', categoryValidator.errors);
      return CommonHelper.ResponseError(
        res,
        categoryValidator.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error',
      );
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { code, name, status, updatedBy: req.user?._id },
      { new: true },
    );

    if (!updatedCategory) {
      return CommonHelper.ResponseError(
        res,
        'Category Not Found',
        HSC.NOT_FOUND,
      );
    }

    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'Category',
      updatedCategory._id as ObjectId,
      'updated',
      req.user?._id as ObjectId,
      `${userName} has updated ${secondName} category.`,
    );

    return CommonHelper.ResponseSuccess(
      res,
      updatedCategory,
      HSC.OK,
      'Category Updated Successfully',
    );
  } catch (error) {
    console.error('Error In Update:', error);
    return CommonHelper.ResponseError(
      res,
      'Internal Server Error',
      HSC.INTERNAL_SERVER_ERROR,
    );
  }
};

const getAll = async (req: CategoryReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;

    const query: Query = {};
    if (typeof search === 'string' && search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const Page = page ? parseInt(page, 10) : 0;
    const pagesize = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = Category.aggregate();

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

    const countResult: { totalCount: number }[] = await Category.aggregate<{
      totalCount: number;
    }>([...data.pipeline(), { $count: 'totalCount' }]).exec();
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;
    const categories = await Category.find(query)
      .select('code name status')
      .limit(pagesize)
      .skip(Page * pagesize)
      .sort(sortQuery)
      .exec();

    const totalPages = Math.ceil(total / pagesize);
    return CommonHelper.ResponseSuccess(
      res,
      {
        list: categories,
        total: total,
        page: Page,
        pageSize: pagesize,
        totalPages,
      },
      HSC.OK,
      'Category List Successfully Retrieved',
    );
  } catch (error) {
    console.error('Error In Get All:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const getOne = async (req: CategoryReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'ID Is Invalid', HSC.NOT_FOUND);
    }
    const category = await Category.findOne({ _id: id }).select(
      '_id name code status',
    );
    if (!category) {
      return CommonHelper.ResponseError(
        res,
        'Category Not Found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      category,
      HSC.OK,
      'Category Data Retrieved Successfully',
    );
  } catch (error) {
    console.error('Error In Get One:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const Delete = async (req: CategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only Admins Can Delete Categories',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'ID Is Invalid', HSC.NOT_FOUND);
    }
    const category = await Category.findById(id);
    if (!category) {
      return CommonHelper.ResponseError(
        res,
        'Category Not Found',
        HSC.NOT_FOUND,
      );
    }
    await category.deleteSoft();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      category.name.charAt(0).toLowerCase() + category.name.slice(1);
    await create(
      'Category',
      category._id as ObjectId,
      'deleted',
      req.user?._id as ObjectId,
      `${userName} has deleted ${secondName} Category.`,
    );
    return CommonHelper.ResponseSuccess(res, [], HSC.OK, 'Category Deleted ');
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
