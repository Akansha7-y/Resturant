import mongoose from 'mongoose';
import { isConnectedToMongo, LocalDB } from '../config/db.js';

// Mongoose Schemas
const reviewLikeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const reviewCommentSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  userName: { type: String, default: '' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, default: null },
  likes: { type: [reviewLikeSchema], default: [] },
  comments: { type: [reviewCommentSchema], default: [] },
  photos: { type: [String], default: [] },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  ownerReply: { type: String },
  repliedAt: { type: Date }
});

const menuItemSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String, default: 'Main' }
});

const tableSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  seatingArea: { type: String, default: 'Standard' },
  available: { type: Boolean, default: true }
});

const offerSchema = new mongoose.Schema({
  _id: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  discountPercent: { type: Number, default: 10 },
  validFrom: { type: String },
  validUntil: { type: String },
  active: { type: Boolean, default: true }
});

const staffSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  role: { type: String, default: 'Server' },
  email: { type: String },
  phone: { type: String },
  active: { type: Boolean, default: true }
});

const restaurantSchema = new mongoose.Schema({
  _id: { type: String },
  ownerId: { type: String },
  name: { type: String, required: true },
  image: { type: String, required: true },
  cuisine: { type: String, required: true },
  rating: { type: Number, default: 4.5 },
  location: { type: String, required: true },
  address: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  priceRange: { type: String, required: true, enum: ['$', '$$', '$$$', '$$$$'] },
  description: { type: String, required: true },
  features: [{ type: String }],
  menu: [menuItemSchema],
  reviews: [reviewSchema],
  gallery: [{ type: String }],
  tables: [tableSchema],
  offers: [offerSchema],
  staff: [staffSchema],
  workingHours: { type: String, default: '11:00 AM - 11:00 PM' },
  totalTables: { type: Number, default: 20 },
  createdAt: { type: Date, default: Date.now }
});

const escapeRegex = (value) => [...String(value)].map(char => ".^$*+?()[]{}|\\\\ ".includes(char) ? "\\\\" + char : char).join("");

const MongoRestaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);

// Unified Restaurant Data Access Layer
export const RestaurantModel = {
  async find(filters = {}) {
    if (isConnectedToMongo()) {
      let query = {};
      if (filters.cuisine) query.cuisine = new RegExp(escapeRegex(filters.cuisine), 'i');
      if (filters.location) query.location = new RegExp(escapeRegex(filters.location), 'i');
      if (filters.search) {
        query.$or = [
          { name: new RegExp(escapeRegex(filters.search), 'i') },
          { cuisine: new RegExp(filters.search, 'i') },
          { location: new RegExp(filters.search, 'i') }
        ];
      }
      
      let cursor = MongoRestaurant.find(query);
      
      // Additional JS filters for rating/price if standard query is simple
      let results = await cursor.exec();
      
      if (filters.priceRange) {
        results = results.filter(r => r.priceRange === filters.priceRange);
      }
      if (filters.minRating) {
        results = results.filter(r => r.rating >= parseFloat(filters.minRating));
      }
      
      return results;
    } else {
      let list = LocalDB.read('restaurants.json');
      
      if (filters.search) {
        const term = filters.search.toLowerCase();
        list = list.filter(r => 
          r.name.toLowerCase().includes(term) ||
          r.cuisine.toLowerCase().includes(term) ||
          r.location.toLowerCase().includes(term)
        );
      }
      if (filters.cuisine) {
        const term = filters.cuisine.toLowerCase();
        list = list.filter(r => r.cuisine.toLowerCase().includes(term));
      }
      if (filters.location) {
        const term = filters.location.toLowerCase();
        list = list.filter(r => r.location.toLowerCase().includes(term));
      }
      if (filters.priceRange) {
        list = list.filter(r => r.priceRange === filters.priceRange);
      }
      if (filters.minRating) {
        list = list.filter(r => r.rating >= parseFloat(filters.minRating));
      }
      
      return list;
    }
  },

  async findById(id) {
    if (isConnectedToMongo()) {
      return await MongoRestaurant.findById(id);
    } else {
      const list = LocalDB.read('restaurants.json');
      return list.find(r => r._id === id) || null;
    }
  },

  async create(restaurantData) {
    if (isConnectedToMongo()) {
      const restaurant = new MongoRestaurant(restaurantData);
      return await restaurant.save();
    } else {
      const list = LocalDB.read('restaurants.json');
      const newRestaurant = {
        _id: 'r_' + Math.random().toString(36).substr(2, 9),
        ...restaurantData,
        rating: restaurantData.rating || 4.5,
        reviews: restaurantData.reviews || [],
        gallery: restaurantData.gallery || [],
        tables: restaurantData.tables || [],
        offers: restaurantData.offers || [],
        staff: restaurantData.staff || [],
        createdAt: new Date().toISOString()
      };
      list.push(newRestaurant);
      LocalDB.write('restaurants.json', list);
      return newRestaurant;
    }
  },

  async findByOwnerId(ownerId) {
    if (isConnectedToMongo()) {
      return await MongoRestaurant.findOne({ ownerId });
    } else {
      const list = LocalDB.read('restaurants.json');
      return list.find(r => r.ownerId === ownerId) || null;
    }
  },

  async updateById(id, updateData) {
    if (isConnectedToMongo()) {
      return await MongoRestaurant.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    } else {
      const list = LocalDB.read('restaurants.json');
      const index = list.findIndex(r => r._id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updateData };
      LocalDB.write('restaurants.json', list);
      return list[index];
    }
  },

  async addGalleryPhotos(restaurantId, photos) {
    const restaurant = await this.findById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');
    const gallery = [...(restaurant.gallery || []), ...photos].slice(0, 20);
    return await this.updateById(restaurantId, { gallery });
  },

  async addReview(restaurantId, reviewData) {
    const review = {
      _id: 'rev_' + Math.random().toString(36).substr(2, 9),
      userName: reviewData.userName,
      userId: reviewData.userId || null,
      rating: Number(reviewData.rating),
      comment: reviewData.comment,
      likes: [],
      comments: [],
      photos: reviewData.photos || [],
      createdAt: new Date().toISOString()
    };

    if (isConnectedToMongo()) {
      const restaurant = await MongoRestaurant.findById(restaurantId);
      if (!restaurant) throw new Error('Restaurant not found');
      
      restaurant.reviews.push(review);
      const totalRating = restaurant.reviews.reduce((acc, rev) => acc + rev.rating, 0);
      restaurant.rating = Number((totalRating / restaurant.reviews.length).toFixed(1));
      
      return await restaurant.save();
    } else {
      const list = LocalDB.read('restaurants.json');
      const index = list.findIndex(r => r._id === restaurantId);
      if (index === -1) throw new Error('Restaurant not found');
      
      const restaurant = list[index];
      if (!restaurant.reviews) restaurant.reviews = [];
      
      restaurant.reviews.push(review);
      const totalRating = restaurant.reviews.reduce((acc, rev) => acc + rev.rating, 0);
      restaurant.rating = Number((totalRating / restaurant.reviews.length).toFixed(1));
      
      list[index] = restaurant;
      LocalDB.write('restaurants.json', list);
      return restaurant;
    }
  },

  async likeReview(restaurantId, reviewId, userId, userName) {
    const restaurant = await this.findById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const reviews = (restaurant.reviews || []).map((r, i) => {
      const id = r._id || String(i);
      if (id !== reviewId && String(i) !== reviewId) return r;
      const likes = Array.isArray(r.likes) ? [...r.likes] : [];
      const existing = likes.findIndex(l => l.userId === userId);
      if (existing >= 0) {
        likes.splice(existing, 1);
      } else {
        likes.push({ userId, userName, at: new Date().toISOString() });
      }
      return { ...r, _id: id, likes };
    });

    return await this.updateById(restaurantId, { reviews });
  },

  async commentOnReview(restaurantId, reviewId, commentData) {
    const restaurant = await this.findById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const reviews = (restaurant.reviews || []).map((r, i) => {
      const id = r._id || String(i);
      if (id !== reviewId && String(i) !== reviewId) return r;
      const comments = Array.isArray(r.comments) ? [...r.comments] : [];
      comments.push({
        _id: 'cmt_' + Math.random().toString(36).substr(2, 9),
        userId: commentData.userId,
        userName: commentData.userName,
        text: commentData.text,
        createdAt: new Date().toISOString()
      });
      return { ...r, _id: id, comments };
    });

    return await this.updateById(restaurantId, { reviews });
  },

  async bulkCreate(restaurantsList) {
    if (isConnectedToMongo()) {
      await MongoRestaurant.deleteMany({});
      return await MongoRestaurant.insertMany(restaurantsList);
    } else {
      LocalDB.write('restaurants.json', restaurantsList);
      return restaurantsList;
    }
  }
};
