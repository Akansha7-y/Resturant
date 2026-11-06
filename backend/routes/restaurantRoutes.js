import express from 'express';
import { RestaurantModel } from '../models/restaurantModel.js';
import { UserModel } from '../models/userModel.js';
import { authenticateToken, requireAdmin } from './authRoutes.js';

const router = express.Router();

// @route   GET api/restaurants
router.get('/', async (req, res) => {
  try {
    const { search, cuisine, location, priceRange, minRating } = req.query;
    const restaurants = await RestaurantModel.find({
      search,
      cuisine,
      location,
      priceRange,
      minRating
    });
    res.json(restaurants);
  } catch (error) {
    console.error('Fetch restaurants error:', error);
    res.status(500).json({ message: 'Server error retrieving restaurants.' });
  }
});

// @route   GET api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await RestaurantModel.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }
    res.json(restaurant);
  } catch (error) {
    console.error('Fetch restaurant details error:', error);
    res.status(500).json({ message: 'Server error retrieving restaurant details.' });
  }
});

// @route   POST api/restaurants
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newRestaurant = await RestaurantModel.create(req.body);
    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ message: 'Server error adding restaurant.' });
  }
});

// @route   POST api/restaurants/:id/reviews
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment, photos } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Please provide rating and comment.' });
    }

    const photoList = Array.isArray(photos) ? photos.filter(Boolean).slice(0, 5) : [];

    const updatedRestaurant = await RestaurantModel.addReview(req.params.id, {
      userName: req.user.name,
      userId: req.user.id,
      rating,
      comment,
      photos: photoList
    });

    // Bonus points for writing a review (+15), extra for photos (+10)
    let bonus = 15;
    if (photoList.length > 0) bonus += 10;
    await UserModel.addRewardPoints(req.user.id, bonus);

    res.status(201).json({
      restaurant: updatedRestaurant,
      pointsAwarded: bonus
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: error.message || 'Server error adding review.' });
  }
});

// @route   POST api/restaurants/:id/gallery
// @desc    Logged-in users can upload photos to restaurant gallery (URL or data URL)
router.post('/:id/gallery', authenticateToken, async (req, res) => {
  try {
    const { photos, photo } = req.body;
    const list = Array.isArray(photos) ? photos : (photo ? [photo] : []);
    const cleaned = list.filter(p => typeof p === 'string' && p.length > 0).slice(0, 5);

    if (!cleaned.length) {
      return res.status(400).json({ message: 'Provide at least one photo URL or image data.' });
    }

    const restaurant = await RestaurantModel.addGalleryPhotos(req.params.id, cleaned);
    await UserModel.addRewardPoints(req.user.id, 10);

    res.status(201).json({
      restaurant,
      message: 'Photos added to gallery. +10 reward points earned.'
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({ message: error.message || 'Server error uploading photos.' });
  }
});

// @route   POST api/restaurants/:id/reviews/:reviewId/like
router.post('/:id/reviews/:reviewId/like', authenticateToken, async (req, res) => {
  try {
    const restaurant = await RestaurantModel.likeReview(
      req.params.id,
      req.params.reviewId,
      req.user.id,
      req.user.name
    );
    res.json(restaurant);
  } catch (error) {
    console.error('Like review error:', error);
    res.status(500).json({ message: error.message || 'Could not like review.' });
  }
});

// @route   POST api/restaurants/:id/reviews/:reviewId/comments
router.post('/:id/reviews/:reviewId/comments', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    const restaurant = await RestaurantModel.commentOnReview(req.params.id, req.params.reviewId, {
      userId: req.user.id,
      userName: req.user.name,
      text: String(text).trim()
    });
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Comment review error:', error);
    res.status(500).json({ message: error.message || 'Could not add comment.' });
  }
});

export default router;
