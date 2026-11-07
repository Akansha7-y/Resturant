import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, LocalDB, isConnectedToMongo } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { RestaurantModel } from './models/restaurantModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Premium Restaurant Booking API is active.');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Seed data function
async function seedRestaurants() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const seedFilePath = path.join(__dirname, 'data', 'restaurantsData.json');
    const rawData = fs.readFileSync(seedFilePath, 'utf8');
    const seedData = JSON.parse(rawData);

    if (isConnectedToMongo()) {
      const count = await RestaurantModel.find();
      if (count.length === 0) {
        console.log('Seeding restaurants mock data to MongoDB...');
        await RestaurantModel.bulkCreate(seedData);
        console.log('Successfully seeded MongoDB!');
      } else {
        console.log('MongoDB already contains restaurant data. Skipping seed.');
      }
    } else {
      // Local fallback
      const localData = LocalDB.read('restaurants.json');
      if (localData.length === 0) {
        console.log('Seeding restaurants mock data to Local File Database...');
        LocalDB.write('restaurants.json', seedData);
        console.log('Successfully seeded Local File Database!');
      } else {
        console.log('Local File Database already contains restaurant data. Skipping seed.');
      }
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Start Server
async function startServer() {
  // Connect DB (handles fallback internally)
  await connectDB();
  
  // Seed Database
  await seedRestaurants();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
