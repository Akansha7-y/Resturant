import express from 'express';
import { BookingModel } from '../models/bookingModel.js';
import { RestaurantModel } from '../models/restaurantModel.js';
import { authenticateToken } from './authRoutes.js';

const router = express.Router();

// @route   POST api/bookings
// @desc    Create a new booking (pending payment)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, date, time, guests, seatingArea, specialRequests } = req.body;

    if (!restaurantId || !date || !time || !guests) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Mock Booking Price - say, deposit of $15 per person to hold a premium table
    const bookingDepositAmount = guests * 15;

    const booking = await BookingModel.create({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      restaurantId,
      restaurantName: restaurant.name,
      restaurantImage: restaurant.image,
      date,
      time,
      guests,
      seatingArea: seatingArea || 'Standard',
      specialRequests,
      status: 'pending_payment',
      paymentDetails: {
        status: 'unpaid',
        amount: bookingDepositAmount,
        transactionId: '',
        cardLast4: '',
        paidAt: null
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error creating booking.' });
  }
});

// @route   POST api/bookings/:id/pay
// @desc    Process mock payment for table booking
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv } = req.body;

    if (!cardNumber || !expiryDate || !cvv) {
      return res.status(400).json({ message: 'Payment details incomplete (Card Number, Expiry, CVV required).' });
    }

    const booking = await BookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to pay for this booking.' });
    }

    if (booking.status === 'confirmed' && booking.paymentDetails.status === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid and confirmed.' });
    }

    if (booking.status === 'pending_approval') {
      return res.status(400).json({ message: 'Booking is already paid and awaiting restaurant approval.' });
    }

    // Simulate Payment Validation
    // Cards starting with '4' (Visa) or '5' (Mastercard) are valid in our mock
    const cleanedCard = cardNumber.replace(/\s+/g, '');
    if (cleanedCard.length < 12 || isNaN(cleanedCard)) {
      return res.status(400).json({ message: 'Invalid card format. Please enter a valid 16-digit card.' });
    }

    const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const cardLast4 = cleanedCard.slice(-4);

    const updatedBooking = await BookingModel.findOneAndUpdate(req.params.id, {
      status: 'pending_approval',
      paymentDetails: {
        status: 'paid',
        transactionId,
        cardLast4,
        paidAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Payment received! Your reservation is pending restaurant approval.',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Mock payment process error:', error);
    res.status(500).json({ message: 'Server error processing payment.' });
  }
});

// @route   GET api/bookings
// @desc    Get all bookings (Admin gets all, user gets their own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }
    const bookings = await BookingModel.find(query);
    res.json(bookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ message: 'Server error retrieving bookings.' });
  }
});

// @route   PUT api/bookings/:id/cancel
// @desc    Cancel a table reservation
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    const updatedBooking = await BookingModel.findOneAndUpdate(req.params.id, {
      status: 'cancelled'
    });

    res.json({
      success: true,
      message: 'Reservation cancelled successfully.',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error cancelling booking.' });
  }
});

export default router;
