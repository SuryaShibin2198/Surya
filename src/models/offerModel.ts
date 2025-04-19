import mongoose, { model, Schema } from "mongoose";
import { OfferInterface } from "../types/model";


interface OfferModel extends OfferInterface, Document {}

const offerSchema = new Schema<OfferModel>({
    offerName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    offerPercentage: { type: Number, required: true },
    categoryName: { type: mongoose.Schema.Types.ObjectId, ref:'Category', required: true },
    priceRange: { type: Number, required: true },
    offerCode: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref:'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref:'User', default: null },
});

const Offer = model<OfferModel>('Offer', offerSchema);

export default Offer;
