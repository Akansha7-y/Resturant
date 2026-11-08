import { RestaurantModel } from '../models/restaurantModel.js';
import { BookingModel } from '../models/bookingModel.js';

const PRICE_MAP = { $: 800, $$: 1500, $$$: 2800, $$$$: 6000 };
const PRICE_SYMBOLS = ['$', '$$', '$$$', '$$$$'];

const MOOD_CUISINES = {
  romantic: ['French', 'Italian', 'Japanese'],
  family: ['Italian', 'Mexican', 'Indian', 'Cafe'],
  business: ['French', 'Japanese', 'Cafe'],
  party: ['Mexican', 'Italian', 'Indian'],
  casual: ['Cafe', 'Mexican', 'Italian'],
  luxury: ['French', 'Japanese'],
  spicy: ['Indian', 'Mexican'],
  vegan: ['Cafe', 'Indian'],
};

const INTENT_KEYWORDS = {
  romantic: ['romantic', 'date', 'anniversary', 'intimate', 'couple', 'proposal'],
  family: ['family', 'kids', 'children', 'group'],
  business: ['business', 'meeting', 'client', 'corporate'],
  party: ['party', 'celebration', 'birthday', 'friends'],
  casual: ['casual', 'quick', 'brunch', 'coffee', 'lunch'],
  luxury: ['luxury', 'fine dining', 'michelin', 'premium', 'upscale'],
  spicy: ['spicy', 'hot', 'chili'],
};

/**
 * Parse natural-language dining request into structured filters + ranked restaurants.
 * Example: "I want romantic dinner under 2500"
 */
export function parseDiningQuery(query = '') {
  const text = String(query).toLowerCase();
  const parsed = {
    moods: [],
    cuisines: [],
    maxBudget: null,
    minRating: null,
    location: null,
    guests: null,
    keywords: []
  };

  for (const [mood, words] of Object.entries(INTENT_KEYWORDS)) {
    if (words.some(w => text.includes(w))) {
      parsed.moods.push(mood);
      parsed.cuisines.push(...(MOOD_CUISINES[mood] || []));
    }
  }

  const cuisineNames = ['french', 'japanese', 'italian', 'indian', 'mexican', 'cafe', 'sushi', 'pizza', 'tandoor'];
  cuisineNames.forEach(c => {
    if (text.includes(c)) {
      const mapped = c === 'sushi' ? 'Japanese' : c === 'pizza' ? 'Italian' : c === 'tandoor' ? 'Indian' : c.charAt(0).toUpperCase() + c.slice(1);
      if (!parsed.cuisines.includes(mapped)) parsed.cuisines.push(mapped);
    }
  });

  // Budget: under 2500 / below $2000 / max 1500 / budget 1000
  const budgetMatch = text.match(/(?:under|below|max|less than|budget(?: of)?|upto|up to)\s*\$?\s*(\d{3,5})/i)
    || text.match(/\$\s*(\d{3,5})\s*(?:or less|max)?/i);
  if (budgetMatch) {
    parsed.maxBudget = Number(budgetMatch[1]);
  }

  const ratingMatch = text.match(/(?:rating|rated)\s*(?:above|over|at least)?\s*(\d(?:\.\d)?)/i)
    || text.match(/(\d(?:\.\d)?)\s*\+?\s*stars?/i);
  if (ratingMatch) parsed.minRating = Number(ratingMatch[1]);

  const guestMatch = text.match(/(\d+)\s*(?:guests?|people|persons?|pax)/i);
  if (guestMatch) parsed.guests = Number(guestMatch[1]);

  const locations = ['manhattan', 'brooklyn', 'soho', 'village', 'uptown', 'downtown', 'theatre', 'greenwich'];
  for (const loc of locations) {
    if (text.includes(loc)) {
      parsed.location = loc;
      break;
    }
  }

  parsed.cuisines = [...new Set(parsed.cuisines)];
  return parsed;
}

function estimateAvgPrice(restaurant) {
  if (restaurant.menu?.length) {
    const prices = restaurant.menu.map(m => Number(m.price) || 0).filter(Boolean);
    if (prices.length) {
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      // Rough dinner for 2 estimate
      return Math.round(avg * 2.2);
    }
  }
  return PRICE_MAP[restaurant.priceRange] || 2000;
}

function scoreRestaurant(r, parsed) {
  let score = (r.rating || 0) * 12;
  const blob = `${r.name} ${r.cuisine} ${r.location} ${r.description} ${(r.features || []).join(' ')}`.toLowerCase();

  parsed.moods.forEach(mood => {
    INTENT_KEYWORDS[mood]?.forEach(w => {
      if (blob.includes(w)) score += 8;
    });
    if ((MOOD_CUISINES[mood] || []).includes(r.cuisine)) score += 15;
  });

  if (parsed.cuisines.length && parsed.cuisines.includes(r.cuisine)) score += 20;

  const est = estimateAvgPrice(r);
  if (parsed.maxBudget) {
    if (est <= parsed.maxBudget) score += 25;
    else score -= Math.min(40, (est - parsed.maxBudget) / 50);
  }

  if (parsed.minRating && r.rating >= parsed.minRating) score += 10;
  if (parsed.location && (r.location || '').toLowerCase().includes(parsed.location)) score += 12;

  if (parsed.moods.includes('romantic') && (r.features || []).some(f => /private|wine|dress|harp|intimate/i.test(f))) {
    score += 10;
  }

  return { score, estimatedDinnerForTwo: est };
}

export async function aiSearchRestaurants(query) {
  const parsed = parseDiningQuery(query);
  let list = await RestaurantModel.find({});

  if (parsed.maxBudget) {
    list = list.filter(r => estimateAvgPrice(r) <= parsed.maxBudget * 1.15);
  }
  if (parsed.minRating) {
    list = list.filter(r => r.rating >= parsed.minRating);
  }
  if (parsed.location) {
    const locFiltered = list.filter(r => (r.location || '').toLowerCase().includes(parsed.location));
    if (locFiltered.length) list = locFiltered;
  }
  if (parsed.cuisines.length) {
    const cuisineFiltered = list.filter(r => parsed.cuisines.includes(r.cuisine));
    if (cuisineFiltered.length) list = cuisineFiltered;
  }

  const ranked = list
    .map(r => {
      const { score, estimatedDinnerForTwo } = scoreRestaurant(r, parsed);
      return {
        ...r,
        aiScore: Math.round(score * 10) / 10,
        estimatedDinnerForTwo,
        matchReason: buildMatchReason(r, parsed, estimatedDinnerForTwo)
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 8);

  return {
    query,
    parsed,
    count: ranked.length,
    restaurants: ranked,
    assistantMessage: buildSearchMessage(query, parsed, ranked)
  };
}

function buildMatchReason(r, parsed, est) {
  const reasons = [];
  if (parsed.moods.length) reasons.push(`Fits ${parsed.moods.join(', ')} vibe`);
  if (parsed.cuisines.includes(r.cuisine)) reasons.push(`${r.cuisine} cuisine match`);
  if (parsed.maxBudget && est <= parsed.maxBudget) reasons.push(`~$${est} for two (within budget)`);
  reasons.push(`${r.rating}★ rated`);
  return reasons.join(' · ');
}

function buildSearchMessage(query, parsed, ranked) {
  if (!ranked.length) {
    return `I couldn't find a perfect match for "${query}". Try adjusting budget or cuisine.`;
  }
  const top = ranked[0];
  const budget = parsed.maxBudget ? ` under $${parsed.maxBudget}` : '';
  const mood = parsed.moods.length ? ` ${parsed.moods.join('/')} ` : ' ';
  return `Based on your request for a${mood}dinner${budget}, I recommend **${top.name}** (${top.cuisine}, ${top.rating}★). Estimated ~$${top.estimatedDinnerForTwo} for two. Here are ${ranked.length} best matches.`;
}

export function summarizeReviews(restaurant) {
  const reviews = restaurant.reviews || [];
  if (!reviews.length) {
    return {
      summary: 'No guest reviews yet. Be the first to share your experience.',
      highlights: [],
      sentiment: 'neutral',
      avgRating: restaurant.rating || 0,
      reviewCount: 0
    };
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const positive = reviews.filter(r => r.rating >= 4);
  const negative = reviews.filter(r => r.rating <= 2);

  const wordBag = {};
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'was', 'is', 'it', 'for', 'with', 'this', 'that', 'my', 'we', 'our', 'i', 'on', 'at']);
  reviews.forEach(r => {
    String(r.comment || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length > 3 && !stop.has(w)) wordBag[w] = (wordBag[w] || 0) + 1;
    });
  });
  const topWords = Object.entries(wordBag).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);

  const highlights = positive.slice(0, 3).map(r => r.comment);
  const sentiment = avg >= 4.3 ? 'excellent' : avg >= 3.5 ? 'positive' : avg >= 2.5 ? 'mixed' : 'critical';

  const summary = `Guests rate ${restaurant.name} ${avg.toFixed(1)}/5 across ${reviews.length} review${reviews.length > 1 ? 's' : ''}. ` +
    `Overall sentiment is ${sentiment}` +
    (positive.length ? ` — ${positive.length} glowing review${positive.length > 1 ? 's' : ''}` : '') +
    (negative.length ? `, with ${negative.length} critical note${negative.length > 1 ? 's' : ''}` : '') +
    `. Common themes: ${topWords.length ? topWords.join(', ') : 'dining experience'}. ` +
    (highlights[0] ? `Guests often mention: "${highlights[0].slice(0, 120)}${highlights[0].length > 120 ? '…' : ''}"` : '');

  return {
    summary,
    highlights,
    topThemes: topWords,
    sentiment,
    avgRating: Number(avg.toFixed(1)),
    reviewCount: reviews.length,
    positiveCount: positive.length,
    negativeCount: negative.length
  };
}

export async function predictWaitTime(restaurantId) {
  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) return null;

  const bookings = await BookingModel.find({ restaurantId });
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 Sun
  const isWeekend = day === 0 || day === 5 || day === 6;
  const isPeak = (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21);

  const active = bookings.filter(b => ['confirmed', 'pending_approval', 'pending_payment'].includes(b.status));
  const tables = restaurant.tables?.length || restaurant.totalTables || 12;
  const occupancy = Math.min(0.95, active.length / Math.max(tables, 1));

  let minutes = 5 + Math.round(occupancy * 35);
  if (isPeak) minutes += 12;
  if (isWeekend) minutes += 8;
  if ((restaurant.rating || 0) >= 4.7) minutes += 5; // popular venues

  const level = minutes <= 15 ? 'low' : minutes <= 30 ? 'moderate' : 'high';

  return {
    restaurantId,
    restaurantName: restaurant.name,
    predictedWaitMinutes: minutes,
    level,
    occupancyPercent: Math.round(occupancy * 100),
    factors: [
      isPeak ? 'Peak dining hours' : 'Off-peak hours',
      isWeekend ? 'Weekend demand' : 'Weekday traffic',
      `${active.length} active reservations vs ~${tables} tables`,
      `Popularity rating ${restaurant.rating}★`
    ],
    advice: minutes <= 15
      ? 'Good time to walk in or book — short expected wait.'
      : minutes <= 30
        ? 'Moderate wait expected. Reserving a table is recommended.'
        : 'Busy period. Book ahead to skip the line.'
  };
}

export async function personalizedRecommendations(userId) {
  const all = await RestaurantModel.find({});
  let preferredCuisines = [];
  let bookedIds = new Set();

  if (userId) {
    const bookings = await BookingModel.find({ userId });
    bookedIds = new Set(bookings.map(b => b.restaurantId));
    const cuisineCount = {};
    bookings.forEach(b => {
      const r = all.find(x => x._id === b.restaurantId);
      if (r) cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
    });
    preferredCuisines = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }

  const ranked = all
    .map(r => {
      let score = (r.rating || 0) * 10;
      if (preferredCuisines.includes(r.cuisine)) score += 25;
      if (bookedIds.has(r._id)) score -= 15; // suggest something new
      if ((r.offers || []).some(o => o.active)) score += 5;
      return {
        ...r,
        aiScore: score,
        reason: preferredCuisines.includes(r.cuisine)
          ? `Matches your ${r.cuisine} preference from past bookings`
          : bookedIds.has(r._id)
            ? 'You booked here before — guests also love similar spots'
            : `Highly rated ${r.cuisine} pick (${r.rating}★)`
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 6);

  return {
    preferredCuisines,
    restaurants: ranked,
    message: preferredCuisines.length
      ? `Based on your history with ${preferredCuisines.join(', ')}, here are personalized picks.`
      : 'Top-rated picks for you — book once to unlock deeper personalization.'
  };
}

export async function chatAssistant(message, history = [], userId = null) {
  const text = String(message || '').trim();
  if (!text) return { reply: 'Ask me anything about restaurants, bookings, wait times, or dining ideas!' };

  const lower = text.toLowerCase();

  // Route to search if it looks like a dining request
  if (/(want|looking for|find|suggest|recommend|romantic|dinner|under|budget|cuisine)/i.test(lower)) {
    const result = await aiSearchRestaurants(text);
    return {
      reply: result.assistantMessage,
      type: 'search',
      restaurants: result.restaurants.slice(0, 4),
      parsed: result.parsed
    };
  }

  if (/wait|busy|crowd|queue/i.test(lower)) {
    const all = await RestaurantModel.find({});
    const nameHit = all.find(r => lower.includes(r.name.toLowerCase().split(' ')[0].toLowerCase()));
    if (nameHit) {
      const wait = await predictWaitTime(nameHit._id);
      return {
        reply: `${wait.restaurantName}: about ${wait.predictedWaitMinutes} min wait (${wait.level}). ${wait.advice}`,
        type: 'wait',
        wait
      };
    }
    return {
      reply: 'Tell me which restaurant (e.g. "wait time at L\'Ambroisie") and I\'ll predict the wait.',
      type: 'text'
    };
  }

  if (/book|reserv|table|how (do|to) book/i.test(lower)) {
    return {
      reply: 'To book: open a restaurant → choose date, time & guests → pay the hold deposit → wait for restaurant approval. You can also add it to Google Calendar after booking.',
      type: 'text'
    };
  }

  if (/otp|login|sign in|password/i.test(lower)) {
    return {
      reply: 'You can sign in with password or OTP. OTP is emailed to a valid address — including first-time users.',
      type: 'text'
    };
  }

  if (/hello|hi|hey|help/i.test(lower)) {
    return {
      reply: "Hi! I'm L'Étoile Concierge. Try: \"romantic dinner under 2500\", \"wait time at Sakura Zen\", or ask how to book a table.",
      type: 'text'
    };
  }

  // Fallback: try search anyway
  const result = await aiSearchRestaurants(text);
  if (result.restaurants.length) {
    return {
      reply: result.assistantMessage,
      type: 'search',
      restaurants: result.restaurants.slice(0, 3)
    };
  }

  return {
    reply: "I can help with restaurant recommendations, wait times, bookings, and reviews. Try describing what you're craving!",
    type: 'text'
  };
}

export { PRICE_MAP, PRICE_SYMBOLS, estimateAvgPrice };
