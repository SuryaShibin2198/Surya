import { Response } from 'express';
import CommonHelper from '../helpers/CommonHelper';
import { CouponReq } from '../types/couponTypes';
import HSC from '../constants/HttpStatusCodes';
import { CommonError, Query } from '../types/common/common';
import Coupon from '../models/couponModel';

const add = async (req: CouponReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can add coupons',
      );
    }

    const { code, discount, expiryDate, usageLimit } = req.body;

    if (!code || !discount || !expiryDate || !usageLimit) {
      return CommonHelper.ResponseError(
        res,
        'All coupon fields are required',
        HSC.BAD_REQUEST,
      );
    }

    const coupon = new Coupon({
      code,
      discount,
      expiryDate,
      usageLimit,
      createdBy: req.user._id,
    });

    await coupon.save();

    return CommonHelper.ResponseSuccess(
      res,
      coupon,
      HSC.OK,
      'Coupon created successfully',
    );
  } catch (error) {
    const e = error as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR,
    );
  }
};

const getAll = async (req: CouponReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;

    const query: Query = {};

    if (search) {
      query.$or = [
        { code: new RegExp(search.toString(), 'i') },
        { discount: new RegExp(search.toString(), 'i') },
      ];
    }

    const Page = page ? parseInt(page.toString(), 10) : 0;
    const pageSizeValue = pageSize ? parseInt(pageSize.toString(), 10) : 10;

    const sortQuery: any = {};
    if (sort && field) {
      sortQuery[field.toString()] = sort === 'asc' ? 1 : -1;
    } else {
      sortQuery.createdAt = -1;
    }

    const totalCount = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .skip(Page * pageSizeValue)
      .limit(pageSizeValue)
      .sort(sortQuery)
      .exec();

    const totalPages = Math.ceil(totalCount / pageSizeValue);

    return CommonHelper.ResponseSuccess(
      res,
      {
        list: coupons,
        total: totalCount,
        page: Page,
        pageSize: pageSizeValue,
        totalPages,
      },
      HSC.OK,
      'Coupons fetched successfully',
    );
  } catch (error) {
    const e = error as CommonError;
    return CommonHelper.ResponseError(
      res,
      e.message,
      HSC.INTERNAL_SERVER_ERROR,
    );
  }
};

export default {
  add,
  getAll,
} as const;
