import mongoose from 'mongoose';
import { isConnectedToMongo, LocalDB } from '../config/db.js';

// Mongoose Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  restaurantId: { type: String, required: true },
  restaurantName: { type: String, required: true },
  restaurantImage: { type: String },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true },
  seatingArea: { type: String, default: 'Standard' },
  specialRequests: { type: String },
  status: { type: String, enum: ['confirmed', 'cancelled', 'pending_payment', 'pending_approval', 'rejected'], default: 'pending_payment' },
  tableId: { type: String },
  ownerNote: { type: String },
  paymentDetails: {
    status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    amount: { type: Number, default: 0 },
    transactionId: { type: String },
    cardLast4: { type: String },
    paidAt: { type: Date }
  },
  pointsEarned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const MongoBooking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// Unified Booking Data Access Layer
export const BookingModel = {
  async find(query = {}) {
    if (isConnectedToMongo()) {
      return await MongoBooking.find(query).sort({ createdAt: -1 });
    } else {
      let bookings = LocalDB.read('bookings.json');
      
      // Filter based on simple query keys
      if (query.userId) {
        bookings = bookings.filter(b => b.userId === query.userId);
      }
      if (query.restaurantId) {
        bookings = bookings.filter(b => b.restaurantId === query.restaurantId);
      }
      
      // Sort desc by createdAt
      return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async findById(id) {
    if (isConnectedToMongo()) {
      return await MongoBooking.findById(id);
    } else {
      const bookings = LocalDB.read('bookings.json');
      return bookings.find(b => b._id === id) || null;
    }
  },

  async create(bookingData) {
    if (isConnectedToMongo()) {
      const booking = new MongoBooking(bookingData);
      return await booking.save();
    } else {
      const bookings = LocalDB.read('bookings.json');
      const newBooking = {
        _id: 'b_' + Math.random().toString(36).substr(2, 9),
        ...bookingData,
        status: bookingData.status || 'pending_payment',
        paymentDetails: {
          status: bookingData.paymentDetails?.status || 'unpaid',
          amount: bookingData.paymentDetails?.amount || 0,
          transactionId: bookingData.paymentDetails?.transactionId || '',
          cardLast4: bookingData.paymentDetails?.cardLast4 || '',
          paidAt: bookingData.paymentDetails?.paidAt || null
        },
        createdAt: new Date().toISOString()
      };
      
      bookings.push(newBooking);
      LocalDB.write('bookings.json', bookings);
      return newBooking;
    }
  },

  async findOneAndUpdate(id, updateData) {
    if (isConnectedToMongo()) {
      return await MongoBooking.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    } else {
      const bookings = LocalDB.read('bookings.json');
      const index = bookings.findIndex(b => b._id === id);
      if (index === -1) return null;
      
      // Perform manual merge update
      const updatedBooking = {
        ...bookings[index],
        ...updateData,
        // Deep merge paymentDetails if passed
        paymentDetails: updateData.paymentDetails ? {
          ...bookings[index].paymentDetails,
          ...updateData.paymentDetails
        } : bookings[index].paymentDetails
      };
      
      bookings[index] = updatedBooking;
      LocalDB.write('bookings.json', bookings);
      return updatedBooking;
    }
  }
};
