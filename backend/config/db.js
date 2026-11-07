import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isMongoConnected = false;

export async function connectDB() {
  const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/restaurant-booking';
  
  console.log('Attempting to connect to MongoDB...');
  try {
    // Set a short timeout for quick fallback
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000 // 10 seconds timeout
    });
    isMongoConnected = true;
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.warn('⚠️ FALLBACK: Falling back to local JSON file-based database. Your data will be stored in backend/data/ folder.');
    isMongoConnected = false;
  }
}

export function isConnectedToMongo() {
  return isMongoConnected;
}

// Fallback JSON-based Database Operations
export const LocalDB = {
  read(filename, defaultData = []) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      this.write(filename, defaultData);
      return defaultData;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading database file ${filename}:`, e);
      return defaultData;
    }
  },

  write(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error(`Error writing database file ${filename}:`, e);
      return false;
    }
  }
};
