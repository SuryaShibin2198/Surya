import { Response } from 'express';
import CommonHelper from '../helpers/CommonHelper';
import { WishlistReq } from '../types/wishlistTypes';
import HSC from '../constants/HttpStatusCodes';
import { CommonError, Query, SortQuery } from '../types/common/common';
import { Wishlist } from '../models/wishlistModel';
import validator from 'node-input-validator';
import { Aggregate, ObjectId } from 'mongoose';
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
        },
      },
    ],
  });
};

const getAll = async (req: WishlistReq, res: Response) => {
  try {
    const { page, pageSize, sort, field } = req.query;
    const query: Query = {};
    const Page = page ? parseInt(page, 10) : 0;
    const pageSizeValue = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = Wishlist.aggregate();
    populateField(data, 'products', 'productId');

    if (query.$or) {
      data.match({ $or: query.$or });
    }
    let sortQuery: SortQuery = {};
    if (sort && field) {
      sortQuery[field] = sort === 'asc' ? 1 : -1;
    } else {
      sortQuery = { createdAt: -1 };
    }
    data.unwind({ path: '$productId', preserveNullAndEmptyArrays: true });

    data.match({ deletedAt: false });

    data.project({
      productId: 1,
    });

    const countResult: { totalCount: number }[] = await Wishlist.aggregate<{
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
      'Wishlist Listed Successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const add = async (req: WishlistReq, res: Response) => {
  try {
    const { productId } = req.body;
    const userId = req.user?._id;

    if (!userId || !productId) {
      return CommonHelper.ResponseError(
        res,
        'User ID and Product ID are required',
        HSC.BAD_REQUEST,
      );
    }

    const product = new validator.Validator(
      req.body,
      {
        userId: 'required|exists:User,_id',
        productId: 'required|exists:Product,_id',
      },
      {
        'userId.required': 'userId is required',
        'productId.required': 'productId is required',
        'userId.exists': 'userId not exists',
        'productId.exists': 'productId not exists',
      },
    );
    if (await product.fails()) {
      return CommonHelper.ResponseError(
        res,
        product.errors,
        HSC.UNPROCESSABLE_ENTITY,
        'validation Error',
      );
    }
    const existingWishlistItem = await Wishlist.findOne({ userId, productId });
    if (existingWishlistItem) {
      return CommonHelper.ResponseError(
        res,
        'Product already added in wishlist',
        HSC.BAD_REQUEST,
      );
    }
    const wishlistdata = await Wishlist.create({
      userId,
      productId,
      createdBy: req.user?._id,
    });
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    await create(
      'Product',
      wishlistdata._id as ObjectId,
      'created',
      req.user?._id as ObjectId,
      `${userName} has added the product to wishlist.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      { wishlistdata },
      HSC.OK,
      'Product added to wishlist successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const remove = async (req: WishlistReq, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId || !id) {
      return CommonHelper.ResponseError(
        res,
        'User ID and Wishlist ID are required',
        HSC.BAD_REQUEST,
      );
    }

    const wishlistItem = await Wishlist.findOne({ _id: id, userId });
    if (!wishlistItem) {
      return CommonHelper.ResponseError(
        res,
        'Wishlist item not found',
        HSC.NOT_FOUND,
      );
    }
    await wishlistItem.deleteSoft();
    const userName =
      (req.user?.name.charAt(0).toUpperCase() as string) +
      req.user?.name.slice(1);
    await create(
      'Product',
      wishlistItem._id as ObjectId,
      'removed',
      req.user?._id as ObjectId,
      `${userName} has removed the product from wishlist.`,
    );
    return CommonHelper.ResponseSuccess(
      res,
      wishlistItem,
      HSC.OK,
      'Product removed from wishlist successfully',
    );
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR,
    );
  }
};

export default {
  add,
  remove,
  getAll,
} as const;
