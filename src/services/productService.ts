import { Response } from 'express';
import { productReq } from '../types/productTypes';
import validator from 'node-input-validator';
import CommonHelper from '../helpers/CommonHelper';
import HSC from '../constants/HttpStatusCodes';
import { Product, productModel } from '../models/productModel';
import { create } from './ActivityLogsService';
import mongoose, { Aggregate, Document, ObjectId } from 'mongoose';
import { CommonError, Query, SortQuery } from '../types/common/common';

const populateField = (
  data: Aggregate<Document[]>,
  fieldName: string,
  localField: string
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

const getAll = async (req: productReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;
    const query: Query = {};
    if (typeof search === 'string' && search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'categoryId.name': { $regex: search, $options: 'i' } },
        { 'subCategoryId.name': { $regex: search, $options: 'i' } },
      ];
    }
    const Page = page ? parseInt(page, 10) : 0;
    const pageSizeValue = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = Product.aggregate();
    populateField(data, 'categories', 'categoryId');
    populateField(data, 'subcategories', 'subCategoryId');

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
    data.unwind({ path: '$subCategoryId', preserveNullAndEmptyArrays: true });

    data.match({ deletedAt: false });

    data.project({
      _id: 1,
      name: 1,
      code: 1,
      categoryId: 1,
      subCategoryId: 1,
      inStock: 1,
      quantity: 1,
      originalPrice: 1,
      discountedPrice: 1,
      createdAt: 1,
      productImages: 1,
    });

    const countResult: { totalCount: number }[] = await Product.aggregate<{
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
      'Product List successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const getOne = async (req: productReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const product: Aggregate<productModel[]> = Product.aggregate();
    product.match({ _id: new mongoose.Types.ObjectId(id) });
    product.match({ deletedAt: false });

    populateField(product, 'categories', 'categoryId');
    populateField(product, 'subcategories', 'subCategoryId');

    product.unwind({ path: '$categoryId', preserveNullAndEmptyArrays: true });
    product.unwind({
      path: '$subCategoryId',
      preserveNullAndEmptyArrays: true,
    });

    const result = await product.exec();
    if (!result[0]) {
      return CommonHelper.ResponseError(
        res,
        'Product not found',
        HSC.NOT_FOUND
      );
    }
    const relatedProducts = await Product.find({
      categoryId: result[0].categoryId,
      _id: { $ne: id },
      deletedAt: false,
    }).exec();
    return CommonHelper.ResponseSuccess(
      res,
      { product: result[0], relatedProducts },
      HSC.OK,
      'Product data retrieved successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};
const add = async (req: productReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can add products'
      );
    }
       const product = new validator.Validator(
      req.body,
      {
        name: 'required|unique:Product, name',
        code: 'required|unique:Product, code',
        'categoryId.value': 'required|exists:Category,_id',
        'subCategoryId.value': 'required|exists:SubCategory,_id',
        quantity: 'required',
        inStock: 'required',
        originalPrice: 'required',
        discountedPrice: 'required',
      },
      {
        'name.required': 'Product name is required',
        'code. required': 'Product code is required',
        'categoryId.value.required': 'CategoryId is required',
        'subCategoryId.value.required': 'SubCategoryId is required',
        'categoryId.value.exists': 'CategoryId not exists',
        'subCategoryId.value.exists': 'SubCategoryId not exists',
      }
    );
    if (await product.fails()) {
      return CommonHelper.ResponseError(
        res,
        product.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'validation Error'
      );
    }
    const {
      name,
      code,
      categoryId,
      subCategoryId,
      quantity,
      inStock,
      originalPrice,
      discountedPrice,
    } = req.body;
    const productdata = await Product.create({
      name,
      code,
      categoryId: categoryId.value,
      subCategoryId: subCategoryId.value,
      quantity,
      inStock,
      originalPrice,
      discountedPrice,
      createdBy: req.user?._id,
    });
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'Product',
      productdata._id as ObjectId,
      'created',
      req.user?._id as ObjectId,
      `${userName} has created ${secondName} product.`
    );
    return CommonHelper.ResponseSuccess(
      res,
      {
        essential: {
          label: productdata.name,
          value: productdata._id as ObjectId,
        },
      },
      HSC.OK,
      'Product created successfully'
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const update = async (req: productReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can update products'
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const productdata = await Product.findById(id);
    if (!productdata) {
      return CommonHelper.ResponseError(
        res,
        'Product not found',
        HSC.NOT_FOUND
      );
    }
    const product = new validator.Validator(
      req.body,
      {
        name: 'required|unique:Product,name,' + id,
        code: 'required|unique:Product,code,' + id,
        'categoryId.value': 'required|exists:Category,_id',
        'subCategoryId.value': 'required|exists:SubCategory,_id',
        quantity: 'required',
        inStock: 'required',
        originalPrice: 'required',
        discountedPrice: 'required',
      },
      {
        'name.required': 'Product name is required',
        'code. required': 'Product code is required',
        'categoryId.value.required': 'CategoryId is required',
        'subCategoryId.value.required': 'SubCategoryId is required',
        'categoryId.value.exists': 'CategoryId not exists',
        'subCategoryId.value.exists': 'SubCategoryId not exists',
      }
    );
    if (await product.fails()) {
      return CommonHelper.ResponseError(
        res,
        product.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'Validation Error'
      );
    }
    const {
      name,
      code,
      categoryId,
      subCategoryId,
      quantity,
      inStock,
      originalPrice,
      discountedPrice,
    } = req.body;
    productdata.name = name;
    productdata.code = code;
    productdata.categoryId = categoryId.value;
    productdata.subCategoryId = subCategoryId.value;
    productdata.quantity = quantity;
    productdata.inStock = inStock;
    productdata.originalPrice = originalPrice;
    productdata.discountedPrice = discountedPrice;
    productdata.updatedBy = req.user?._id;
    await productdata.save();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      req.body.name.charAt(0).toLowerCase() + req.body.name.slice(1);
    await create(
      'Product',
      productdata._id as ObjectId,
      'updated',
      req.user?._id as ObjectId,
      `${userName} has updated ${secondName} product.`
    );
    return CommonHelper.ResponseSuccess(
      res,
      productdata,
      HSC.OK,
      'Product updated successfully'
    );
  } catch (error) {
    return CommonHelper.ResponseError(res, error, HSC.NOT_FOUND);
  }
};

const Delete = async (req: productReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can delete sub categories'
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const product = await Product.findById(id);
    if (!product) {
      return CommonHelper.ResponseError(
        res,
        'Product not found',
        HSC.NOT_FOUND
      );
    }
    await product.deleteSoft();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    const secondName =
      product.name.charAt(0).toLowerCase() + product.name.slice(1);
    await create(
      'Product',
      product._id as ObjectId,
      'deleted',
      req.user?._id as ObjectId,
      `${userName} has deleted ${secondName} product.`
    );
    return CommonHelper.ResponseSuccess(res, [], HSC.OK, 'Product deleted ');
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

export default {
  add,
  update,
  Delete,
  getOne,
  getAll,
} as const;
