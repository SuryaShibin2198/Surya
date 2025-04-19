import { Response } from 'express';
import CommonHelper from '../helpers/CommonHelper';
import HSC from '../constants/HttpStatusCodes';
import { CommonError, Query, SortQuery } from '../types/common/common';
import mongoose, { Aggregate } from 'mongoose';
import { Validator } from 'node-input-validator';
import { OfferReq } from '../types/offerTypes';
import Offer from '../models/offerModel';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import User from '../models/userModel';

const add = async (req: OfferReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can add offers',
      );
    }
    const { offerName, startDate, endDate, offerPercentage, categoryName, priceRange, offerCode } = req.body;
    const offerData = await Offer.create({
        offerName, 
        startDate, 
        endDate, 
        offerPercentage, 
        categoryName, 
        priceRange, 
        offerCode,
        createdBy: req.user?._id,
    });

    return CommonHelper.ResponseSuccess(
      res,
      { offerData },
      HSC.OK,
      'Offer created successfully',
    );
  } catch (error) {
    const e = error as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const update = async (req: OfferReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can update offers',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Invalid ID', HSC.NOT_FOUND);
    }

    const { offerName, startDate, endDate, offerPercentage, categoryName, priceRange, offerCode } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      id,
      { offerName, startDate, endDate, offerPercentage, categoryName, priceRange, offerCode, updatedBy: req.user?._id },
      { new: true },
    );

    if (!offer) {
      return CommonHelper.ResponseError(
        res,
        'Offer not found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      offer,
      HSC.OK,
      'Offer updated successfully',
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

const getAll = async (req: OfferReq, res: Response) => {
  try {
    const { search, page, pageSize, sort, field } = req.query;

    const query: Query = {};
    if (typeof search === 'string' && search) {
      query.$or = [{ offerCode: { $regex: search, $options: 'i' } }];
    }

    const Page = page ? parseInt(page, 10) : 0;
    const pagesize = pageSize ? parseInt(pageSize, 10) : 10;
    const data: Aggregate<Document[]> = Offer.aggregate();

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

    const countResult: { totalCount: number }[] = await Offer.aggregate<{
      totalCount: number;
    }>([...data.pipeline(), { $count: 'totalCount' }]).exec();
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;
    const pincodes = await Offer.find(query)
      .select('offerName startDate endDate offerPercentage categoryName priceRange offerCode')
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
      'Offer List successfully retrieved',
    );
  } catch (error) {
    console.error('Error in getAll:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const getOne = async (req: OfferReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const offer = await Offer.findOne({ _id: id }).select(
      '_id offerName startDate endDate offerPercentage categoryName priceRange offerCode',
    );
    if (!offer) {
      return CommonHelper.ResponseError(
        res,
        'Offer not found',
        HSC.NOT_FOUND,
      );
    }
    return CommonHelper.ResponseSuccess(
      res,
      offer,
      HSC.OK,
      'Offer data retrieved successfully',
    );
  } catch (error) {
    console.error('Error in getOne:', error);
    return CommonHelper.ResponseError(res, error, HSC.INTERNAL_SERVER_ERROR);
  }
};

const Delete = async (req: OfferReq, res: Response) => {
  try {
    if (req.user?.name !== 'Admin') {
      return CommonHelper.ResponseError(
        res,
        'Unauthorized',
        HSC.UNAUTHORIZED,
        'Only admins can delete offers',
      );
    }
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return CommonHelper.ResponseError(res, 'Id is invalid', HSC.NOT_FOUND);
    }
    const offer = await Offer.findById(id);
    if (!offer) {
      return CommonHelper.ResponseError(
        res,
        'Offer not found',
        HSC.NOT_FOUND,
      );
    }
    await offer.deleteSoft();

    return CommonHelper.ResponseSuccess(res, [], HSC.OK, 'Offer deleted ');
  } catch (error) {
    const e = error as unknown as CommonError;
    return CommonHelper.ResponseError(res, e.message, HSC.NOT_FOUND);
  }
};

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'suryashibin98@gmail.com', 
      pass: 'jbik mdwl tvss wgkq', 
    },
  });
  
const sendNotificationEmail = async (offer: any, message: string) => {
    try {
        const users = await User.find({}).select('email').exec();
        for (const user of users) {
        await transporter.sendMail({
          from: 'suryashibin98@gmail.com',
          to: user.email,
          subject: 'Upcoming Offer Notification',
          text: `Reminder: ${message} "${offer.offerName}".`,
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
};

cron.schedule('42 15 * * *', async () => {
    const now = new Date();
  
    const offersOneDayBefore = await Offer.find({
      startDate: { $gte: new Date(now.getTime() + 24 * 60 * 60 * 1000), $lt: new Date(now.getTime() + 25 * 60 * 60 * 1000) },
    });
  
    for (const offer of offersOneDayBefore) {
      await sendNotificationEmail(
        offer,
        'Your offer starts tomorrow:'
      );
    }
  
    const offersTwelveHoursBefore = await Offer.find({
      startDate: { $gte: new Date(now.getTime() + 12 * 60 * 60 * 1000), $lt: new Date(now.getTime() + 13 * 60 * 60 * 1000) },
    });
  
    for (const offer of offersTwelveHoursBefore) {
      await sendNotificationEmail(
        offer,
        'Your offer starts in 12 hours:'
      );
    }
  
    const offersOnStartDate = await Offer.find({
      startDate: { $gte: now, $lt: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    });
  
    for (const offer of offersOnStartDate) {
      await sendNotificationEmail(
        offer,
        'Your offer starts today:'
      );
    }
 });



export default {
  getAll,
  getOne,
  add,
  update,
  Delete,
} as const;
