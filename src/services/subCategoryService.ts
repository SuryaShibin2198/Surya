import { SubCategoryReq } from '../types/subCategoryTypes';
import validator from 'node-input-validator';
import mongoose from 'mongoose';
import HSC from '../constants/HttpStatusCodes';
import { SubCategory, SubCategoryModel } from '../models/subCategoryModels';
import CommonHelper from '../helpers/CommonHelper';
import { Response } from 'express';
import { ObjectId } from 'mongoose';
import { CommonError, Query, SortQuery } from '../types/common/common';
import { Aggregate, Document } from 'mongoose';
import { create } from './ActivityLogsService';

const populateField = (
  data: Aggregate<Document[]>,
  fieldName: string,
  localField: string,
) => {
  data.lookup({
    from: fieldName,
    localField: localField,
    foreignField: '_id',
    as: localField,
    pipeline: [
      {
        $project: {
          value: '$_id',
          label: '$name',
          code: 1,
        },
      },
    ],
  });
};

const getAll = async (req: SubCategoryReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;
    const query: Query = {};
    if (typeof search === 'string' && search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'categoryId.name': { $regex: search, $options: 'i' } },
      ];
    }
    const Page = page ? parseInt(page, 10) : 0;
    const pageSizeValue = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = SubCategory.aggregate();
    populateField(data, 'categories', 'categoryId');

    if (query.$or) {
      data.match({ $or: query.$or });
    }
    // Sorting
    let sortQuery: SortQuery = {};
    if (sort && field) {
      sortQuery[field] = sort === 'asc' ? 1 : -1;
    } else {
      sortQuery = { createdAt: -1 };
    }

    data.unwind({ path: '$categoryId', preserveNullAndEmptyArrays: true });

    data.match({ deletedAt: false });

    data.project({
      _id: 1,
      name: 1,
      code: 1,
      categoryId: 1,
      status: 1,
    });

    const countResult: { totalCount: number }[] = await SubCategory.aggregate<{
      totalCount: number;
    }>([...data.pipeline(), { $count: 'totalCount' }]).exec();
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;

    const result = await data
      .skip(Page * pageSizeValue)
      .sort(sortQuery)
      .limit(pageSizeValue)
      .exec();

    const totalPages = Math.ceil(total / pageSizeValue);

    return CommonHelper.ResponseSuccess(
      res,
      {
        list: result,
        total,
        page: Page,
        pageSize: pageSizeValue,
        totalPages,
      },
      HSC.OK,
      'Sub Category List Successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const getOne = async (req: SubCategoryReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const subCategory = await SubCategory.findOne({ _id: id }).populate({
      path: 'categoryId',
      select: '-_id ',
      options: { select: { label: '$name', value: '$_id' } },
    });
    if (!subCategory) {
      return CommonHelper.ResponseError(
        res,
        'Sub Category Not Found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      subCategory,
      HSC.OK,
      'Sub Category Data Successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const add = async (req: SubCategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only Admins Can Add Sub Categories',
      );
    }
    if (!req.body.categoryId) {
      req.body.categoryId = { value: null };
    }
    const subCategory = new validator.Validator(
      req.body,
      {
        name: 'required|unique:SubCategory,name,NULL',
        code: 'required|unique:SubCategory,code,NULL',
        status: 'required',
        categoryId: 'required',
        'categoryId.value': 'required|exists:Category,_id',
      },
      {
        'categoryId.value.exists': 'The  Category Is Not Exists',
        'categoryId.value.required': 'Sub Category Name Is Required',
        'name.required': 'Sub Category Name Is Required',
        'code.required': 'Sub Category Code Is Required',
        'name.unique': 'Sub Category Name Is Already Taken',
        'code.unique': 'Sub Category Code Is Already Taken',
      },
    );
    if (await subCategory.fails()) {
      return CommonHelper.ResponseError(
        res,
        subCategory.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error',
      );
    }
    const { name, code, status, categoryId } = req.body;
    const subCategorydata: SubCategoryModel = await SubCategory.create({
      name,
      code,
      status,
      categoryId: categoryId.value,
      createdBy: req.user?._id,
    });
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'SubCategory',
      subCategorydata._id as ObjectId,
      'created',
      req.user?._id as ObjectId,
      `${userName} has created ${secondName} subCategory.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      {
        essential: {
          label: subCategorydata.name,
          value: subCategorydata._id as ObjectId,
        },
      },
      HSC.OK,
      'Sub category created successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const update = async (req: SubCategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can update sub categories',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const subCategorydata = await SubCategory.findById(id);
    if (!subCategorydata) {
      return CommonHelper.ResponseError(
        res,
        'Sub category not found',
        HSC.NOT_FOUND,
      );
    }
    if (!req.body.categoryId) {
      req.body.categoryId = { value: null };
    }
    const subCategory = new validator.Validator(
      req.body,
      {
        name: 'required|unique:SubCategory,name,' + id,
        code: 'required|unique:SubCategory,code,' + id,
        status: 'required',
        categoryId: 'required',
        'categoryId.value': 'required|exists:Category,_id',
      },
      {
        'categoryId.value.exists': 'The  Category is not exists',
        'categoryId.value.required': 'Category id is required',
        'name.required': 'Sub category name is required',
        'code.required': 'Sub category code is required',
        'name.unique': 'Sub category name is already taken',
        'code.unique': 'Sub category code is already taken',
      },
    );
    if (await subCategory.fails()) {
      return CommonHelper.ResponseError(
        res,
        subCategory.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error',
      );
    }
    const { name, code, status, categoryId } = req.body;
    subCategorydata.name = name;
    subCategorydata.code = code;
    subCategorydata.categoryId = categoryId.value;
    subCategorydata.status = status;
    subCategorydata.updatedBy = req.user?._id;
    await subCategorydata.save();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'SubCategory',
      subCategorydata._id as ObjectId,
      'updated',
      req.user?._id as ObjectId,
      `${userName} has updated ${secondName} subCategory.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      subCategorydata,
      HSC.OK,
      'Sub category updated successfully',
    );
  } catch (error) {
    return CommonHelper.ResponseError(res, error, HSC.NOT_FOUND);
  }
};

const Delete = async (req: SubCategoryReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can delete sub categories',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return CommonHelper.ResponseError(
        res,
        'SubCategory not found',
        HSC.NOT_FOUND,
      );
    }
    await subCategory.deleteSoft();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      subCategory.name.charAt(0).toLowerCase() + subCategory.name.slice(1);
    await create(
      'SubCategory',
      subCategory._id as ObjectId,
      'deleted',
      req.user?._id as ObjectId,
      `${userName} has deleted ${secondName} subCategory.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      [],
      HSC.OK,
      'Sub category deleted ',
    );
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
