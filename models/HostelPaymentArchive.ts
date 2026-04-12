import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelPaymentArchive extends Document {
    originalPaymentId: mongoose.Types.ObjectId;
    hostelId: string;
    memberId: mongoose.Types.ObjectId;
    amount: number;
    paymentMethod: string;
    paymentType: string;
    status: string;
    archivedAt: Date;
    originalCreatedAt: Date;
    fullData: any; // complete snapshot
}

const hostelPaymentArchiveSchema = new Schema<IHostelPaymentArchive>(
    {
        originalPaymentId: { type: Schema.Types.ObjectId, required: true },
        hostelId: { type: String, required: true, index: true },
        memberId: { type: Schema.Types.ObjectId, required: true, index: true },
        amount: { type: Number, required: true },
        paymentMethod: { type: String },
        paymentType: { type: String },
        status: { type: String },
        archivedAt: { type: Date, default: Date.now },
        originalCreatedAt: { type: Date, required: true },
        fullData: { type: Schema.Types.Mixed }
    },
    { timestamps: false }
);

export const HostelPaymentArchive: Model<IHostelPaymentArchive> = 
    mongoose.models.HostelPaymentArchive || 
    mongoose.model<IHostelPaymentArchive>("HostelPaymentArchive", hostelPaymentArchiveSchema);
