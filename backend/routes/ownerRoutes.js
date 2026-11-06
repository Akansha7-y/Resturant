import express from 'express';
import { RestaurantModel } from '../models/restaurantModel.js';
import { BookingModel } from '../models/bookingModel.js';
import { authenticateToken, requireOwner } from './authRoutes.js';

const router = express.Router();

const genId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 9);

async function getOwnerRestaurant(ownerId) {
  return await RestaurantModel.findByOwnerId(ownerId);
}

async function requireOwnerRestaurant(req, res, next) {
  const restaurant = await getOwnerRestaurant(req.user.id);
  if (!restaurant) {
    return res.status(404).json({ message: 'No restaurant registered. Please register your restaurant first.' });
  }
  req.restaurant = restaurant;
  next();
}

// GET /api/owner/restaurant
router.get('/restaurant', authenticateToken, requireOwner, async (req, res) => {
  try {
    const restaurant = await getOwnerRestaurant(req.user.id);
    res.json(restaurant);
  } catch (error) {
    console.error('Get owner restaurant error:', error);
    res.status(500).json({ message: 'Server error retrieving restaurant.' });
  }
});

// POST /api/owner/restaurant - Register restaurant
router.post('/restaurant', authenticateToken, requireOwner, async (req, res) => {
  try {
    const existing = await getOwnerRestaurant(req.user.id);
    if (existing) {
      return res.status(400).json({ message: 'You already have a registered restaurant.' });
    }

    const { name, image, cuisine, location, address, lat, lng, priceRange, description, features, workingHours } = req.body;
    if (!name || !cuisine || !location || !description) {
      return res.status(400).json({ message: 'Please provide name, cuisine, location, and description.' });
    }

    const defaultTables = Array.from({ length: 10 }, (_, i) => ({
      _id: genId('tbl'),
      name: `Table ${i + 1}`,
      capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      seatingArea: i < 3 ? 'VIP' : i < 7 ? 'Standard' : 'Outdoor',
      available: true
    }));

    const restaurant = await RestaurantModel.create({
      ownerId: req.user.id,
      name,
      image: image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      cuisine,
      location,
      address: address || location,
      lat: lat !== undefined && lat !== '' ? Number(lat) : undefined,
      lng: lng !== undefined && lng !== '' ? Number(lng) : undefined,
      priceRange: priceRange || '$$$',
      description,
      features: features || [],
      workingHours: workingHours || '11:00 AM - 11:00 PM',
      menu: [],
      gallery: image ? [image] : [],
      tables: defaultTables,
      offers: [],
      staff: [],
      totalTables: defaultTables.length
    });

    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Register restaurant error:', error);
    res.status(500).json({ message: 'Server error registering restaurant.' });
  }
});

// PUT /api/owner/restaurant - Update profile
router.put('/restaurant', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { name, image, cuisine, location, address, lat, lng, priceRange, description, features, workingHours } = req.body;
    const update = {};
    if (name) update.name = name;
    if (image) update.image = image;
    if (cuisine) update.cuisine = cuisine;
    if (location) update.location = location;
    if (address) update.address = address;
    if (lat !== undefined && lat !== '') update.lat = Number(lat);
    if (lng !== undefined && lng !== '') update.lng = Number(lng);
    if (priceRange) update.priceRange = priceRange;
    if (description) update.description = description;
    if (features) update.features = features;
    if (workingHours) update.workingHours = workingHours;

    const updated = await RestaurantModel.updateById(req.restaurant._id, update);
    res.json(updated);
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ message: 'Server error updating restaurant.' });
  }
});

// POST /api/owner/restaurant/gallery
router.post('/restaurant/gallery', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { photos, photo } = req.body;
    const list = Array.isArray(photos) ? photos : (photo ? [photo] : []);
    const cleaned = list.filter(p => typeof p === 'string' && p.length > 0).slice(0, 5);
    if (!cleaned.length) {
      return res.status(400).json({ message: 'Provide at least one photo URL or image data.' });
    }
    const restaurant = await RestaurantModel.addGalleryPhotos(req.restaurant._id, cleaned);
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({ message: error.message || 'Server error uploading photos.' });
  }
});

// GET /api/owner/menu
router.get('/menu', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  res.json(req.restaurant.menu || []);
});

// POST /api/owner/menu
router.post('/menu', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { name, price, description, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }
    const menu = [...(req.restaurant.menu || [])];
    menu.push({
      _id: genId('menu'),
      name,
      price: Number(price),
      description: description || '',
      category: category || 'Main'
    });
    const updated = await RestaurantModel.updateById(req.restaurant._id, { menu });
    res.status(201).json(updated);
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ message: 'Server error adding menu item.' });
  }
});

// PUT /api/owner/menu/:itemId
router.put('/menu/:itemId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const menu = (req.restaurant.menu || []).map(item =>
      item._id === req.params.itemId ? { ...item, ...req.body, price: req.body.price !== undefined ? Number(req.body.price) : item.price } : item
    );
    const updated = await RestaurantModel.updateById(req.restaurant._id, { menu });
    res.json(updated);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Server error updating menu item.' });
  }
});

// DELETE /api/owner/menu/:itemId
router.delete('/menu/:itemId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const menu = (req.restaurant.menu || []).filter(item => item._id !== req.params.itemId);
    const updated = await RestaurantModel.updateById(req.restaurant._id, { menu });
    res.json(updated);
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Server error deleting menu item.' });
  }
});

// GET /api/owner/tables
router.get('/tables', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  res.json(req.restaurant.tables || []);
});

// POST /api/owner/tables
router.post('/tables', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { name, capacity, seatingArea } = req.body;
    if (!name || !capacity) {
      return res.status(400).json({ message: 'Table name and capacity are required.' });
    }
    const tables = [...(req.restaurant.tables || [])];
    tables.push({
      _id: genId('tbl'),
      name,
      capacity: Number(capacity),
      seatingArea: seatingArea || 'Standard',
      available: true
    });
    const updated = await RestaurantModel.updateById(req.restaurant._id, { tables, totalTables: tables.length });
    res.status(201).json(updated);
  } catch (error) {
    console.error('Add table error:', error);
    res.status(500).json({ message: 'Server error adding table.' });
  }
});

// PUT /api/owner/tables/:tableId
router.put('/tables/:tableId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const tables = (req.restaurant.tables || []).map(t =>
      t._id === req.params.tableId
        ? { ...t, ...req.body, capacity: req.body.capacity !== undefined ? Number(req.body.capacity) : t.capacity }
        : t
    );
    const updated = await RestaurantModel.updateById(req.restaurant._id, { tables });
    res.json(updated);
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ message: 'Server error updating table.' });
  }
});

// PUT /api/owner/tables/:tableId/availability
router.put('/tables/:tableId/availability', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { available } = req.body;
    const tables = (req.restaurant.tables || []).map(t =>
      t._id === req.params.tableId ? { ...t, available: Boolean(available) } : t
    );
    const updated = await RestaurantModel.updateById(req.restaurant._id, { tables });
    res.json(updated);
  } catch (error) {
    console.error('Toggle table availability error:', error);
    res.status(500).json({ message: 'Server error updating table availability.' });
  }
});

// DELETE /api/owner/tables/:tableId
router.delete('/tables/:tableId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const tables = (req.restaurant.tables || []).filter(t => t._id !== req.params.tableId);
    const updated = await RestaurantModel.updateById(req.restaurant._id, { tables, totalTables: tables.length });
    res.json(updated);
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ message: 'Server error deleting table.' });
  }
});

// GET /api/owner/bookings
router.get('/bookings', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const bookings = await BookingModel.find({ restaurantId: req.restaurant._id });
    res.json(bookings);
  } catch (error) {
    console.error('Get owner bookings error:', error);
    res.status(500).json({ message: 'Server error retrieving bookings.' });
  }
});

// PUT /api/owner/bookings/:id/accept
router.put('/bookings/:id/accept', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking || booking.restaurantId !== req.restaurant._id) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (!['pending_approval', 'pending_payment'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be accepted in its current state.' });
    }
    const { tableId } = req.body;
    const updated = await BookingModel.findOneAndUpdate(req.params.id, {
      status: 'confirmed',
      tableId: tableId || booking.tableId
    });
    res.json({ success: true, message: 'Booking accepted.', booking: updated });
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({ message: 'Server error accepting booking.' });
  }
});

// PUT /api/owner/bookings/:id/reject
router.put('/bookings/:id/reject', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking || booking.restaurantId !== req.restaurant._id) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    const { ownerNote } = req.body;
    const updated = await BookingModel.findOneAndUpdate(req.params.id, {
      status: 'rejected',
      ownerNote: ownerNote || 'Reservation declined by restaurant.'
    });
    res.json({ success: true, message: 'Booking rejected.', booking: updated });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({ message: 'Server error rejecting booking.' });
  }
});

// GET /api/owner/offers
router.get('/offers', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  res.json(req.restaurant.offers || []);
});

// POST /api/owner/offers
router.post('/offers', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { title, description, discountPercent, validFrom, validUntil } = req.body;
    if (!title) return res.status(400).json({ message: 'Offer title is required.' });
    const offers = [...(req.restaurant.offers || [])];
    offers.push({
      _id: genId('off'),
      title,
      description: description || '',
      discountPercent: Number(discountPercent) || 10,
      validFrom: validFrom || new Date().toISOString().split('T')[0],
      validUntil: validUntil || '',
      active: true
    });
    const updated = await RestaurantModel.updateById(req.restaurant._id, { offers });
    res.status(201).json(updated);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ message: 'Server error creating offer.' });
  }
});

// PUT /api/owner/offers/:offerId
router.put('/offers/:offerId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const offers = (req.restaurant.offers || []).map(o =>
      o._id === req.params.offerId ? { ...o, ...req.body } : o
    );
    const updated = await RestaurantModel.updateById(req.restaurant._id, { offers });
    res.json(updated);
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ message: 'Server error updating offer.' });
  }
});

// DELETE /api/owner/offers/:offerId
router.delete('/offers/:offerId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const offers = (req.restaurant.offers || []).filter(o => o._id !== req.params.offerId);
    const updated = await RestaurantModel.updateById(req.restaurant._id, { offers });
    res.json(updated);
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ message: 'Server error deleting offer.' });
  }
});

// GET /api/owner/staff
router.get('/staff', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  res.json(req.restaurant.staff || []);
});

// POST /api/owner/staff
router.post('/staff', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { name, role, email, phone } = req.body;
    if (!name) return res.status(400).json({ message: 'Staff name is required.' });
    const staff = [...(req.restaurant.staff || [])];
    staff.push({
      _id: genId('stf'),
      name,
      role: role || 'Server',
      email: email || '',
      phone: phone || '',
      active: true
    });
    const updated = await RestaurantModel.updateById(req.restaurant._id, { staff });
    res.status(201).json(updated);
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ message: 'Server error adding staff.' });
  }
});

// PUT /api/owner/staff/:staffId
router.put('/staff/:staffId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const staff = (req.restaurant.staff || []).map(s =>
      s._id === req.params.staffId ? { ...s, ...req.body } : s
    );
    const updated = await RestaurantModel.updateById(req.restaurant._id, { staff });
    res.json(updated);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error updating staff.' });
  }
});

// DELETE /api/owner/staff/:staffId
router.delete('/staff/:staffId', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const staff = (req.restaurant.staff || []).filter(s => s._id !== req.params.staffId);
    const updated = await RestaurantModel.updateById(req.restaurant._id, { staff });
    res.json(updated);
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error deleting staff.' });
  }
});

// GET /api/owner/reviews
router.get('/reviews', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  res.json(req.restaurant.reviews || []);
});

// PUT /api/owner/reviews/:reviewId/reply
router.put('/reviews/:reviewId/reply', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply text is required.' });
    const reviews = (req.restaurant.reviews || []).map((r, idx) => {
      const id = r._id || String(idx);
      if (id === req.params.reviewId || String(idx) === req.params.reviewId) {
        return { ...r, _id: id, ownerReply: reply, repliedAt: new Date().toISOString() };
      }
      return r;
    });
    const updated = await RestaurantModel.updateById(req.restaurant._id, { reviews });
    res.json(updated);
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ message: 'Server error replying to review.' });
  }
});

// GET /api/owner/analytics
router.get('/analytics', authenticateToken, requireOwner, requireOwnerRestaurant, async (req, res) => {
  try {
    const bookings = await BookingModel.find({ restaurantId: req.restaurant._id });
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const pending = bookings.filter(b => ['pending_approval', 'pending_payment'].includes(b.status));
    const rejected = bookings.filter(b => b.status === 'rejected');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const revenue = confirmed.reduce((sum, b) => sum + (b.paymentDetails?.amount || 0), 0);
    const totalGuests = confirmed.reduce((sum, b) => sum + (b.guests || 0), 0);
    const availableTables = (req.restaurant.tables || []).filter(t => t.available).length;
    const totalTables = (req.restaurant.tables || []).length;
    const avgRating = req.restaurant.rating || 0;
    const reviewCount = (req.restaurant.reviews || []).length;
    const activeOffers = (req.restaurant.offers || []).filter(o => o.active).length;
    const activeStaff = (req.restaurant.staff || []).filter(s => s.active).length;

    const bookingsByDate = {};
    confirmed.forEach(b => {
      bookingsByDate[b.date] = (bookingsByDate[b.date] || 0) + 1;
    });

    res.json({
      revenue,
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      pendingBookings: pending.length,
      rejectedBookings: rejected.length,
      cancelledBookings: cancelled.length,
      totalGuests,
      availableTables,
      totalTables,
      occupancyRate: totalTables ? Math.round(((totalTables - availableTables) / totalTables) * 100) : 0,
      avgRating,
      reviewCount,
      activeOffers,
      activeStaff,
      menuItems: (req.restaurant.menu || []).length,
      galleryPhotos: (req.restaurant.gallery || []).length,
      bookingsByDate
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error retrieving analytics.' });
  }
});

export default router;
