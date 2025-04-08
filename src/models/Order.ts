import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export interface IOrder extends Document {
  userId: Types.ObjectId;
  productId: number;
  price: number;
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    productId: {
      type: Number,
      required: [true, 'Product ID is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
    },
  },
  {
    timestamps: true,
  },
);

export const Order = model<IOrder>('Order', orderSchema);
