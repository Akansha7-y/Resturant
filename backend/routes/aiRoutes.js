import express from 'express';
import {
  aiSearchRestaurants,
  summarizeReviews,
  predictWaitTime,
  personalizedRecommendations,
  chatAssistant
} from '../services/aiService.js';
import { RestaurantModel } from '../models/restaurantModel.js';
import { authenticateToken } from './authRoutes.js';

const router = express.Router();

// POST /api/ai/search — natural language restaurant discovery
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ message: 'Please describe what you want (e.g. romantic dinner under 2500).' });
    }
    const result = await aiSearchRestaurants(String(query).trim());
    res.json(result);
  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({ message: 'AI search failed.' });
  }
});

// POST /api/ai/chat — concierge chat assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.headers.authorization ? null : null; // optional later
    const result = await chatAssistant(message, history || [], userId);
    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Chat assistant unavailable.' });
  }
});

// GET /api/ai/reviews/:restaurantId/summary
router.get('/reviews/:restaurantId/summary', async (req, res) => {
  try {
    const restaurant = await RestaurantModel.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json(summarizeReviews(restaurant));
  } catch (error) {
    console.error('Review summary error:', error);
    res.status(500).json({ message: 'Could not summarize reviews.' });
  }
});

// GET /api/ai/wait-time/:restaurantId
router.get('/wait-time/:restaurantId', async (req, res) => {
  try {
    const wait = await predictWaitTime(req.params.restaurantId);
    if (!wait) return res.status(404).json({ message: 'Restaurant not found.' });
    res.json(wait);
  } catch (error) {
    console.error('Wait prediction error:', error);
    res.status(500).json({ message: 'Could not predict wait time.' });
  }
});

// GET /api/ai/recommendations — personalized (auth optional)
router.get('/recommendations', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET || 'premium_restaurant_secret_key_123'
        );
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }
    const result = await personalizedRecommendations(userId);
    res.json(result);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Could not load recommendations.' });
  }
});

// Authenticated chat with personalization context
router.post('/chat/secure', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    const result = await chatAssistant(message, history || [], req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Secure chat error:', error);
    res.status(500).json({ message: 'Chat assistant unavailable.' });
  }
});

export default router;
