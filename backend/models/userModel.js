import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isConnectedToMongo, LocalDB } from '../config/db.js';

function cryptoRandomPassword() {
  return crypto.randomBytes(24).toString('hex');
}

// Mongoose Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' },
  rewardPoints: { type: Number, default: 0 },
  otpHash: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const MongoUser = mongoose.models.User || mongoose.model('User', userSchema);

const pendingOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otpHash: { type: String, required: true },
  otpExpiry: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});
const MongoPendingOtp = mongoose.models.PendingOtp || mongoose.model('PendingOtp', pendingOtpSchema);

function sanitizeUser(user) {
  if (!user) return null;
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  const { password, otpHash, otpExpiry, ...safe } = plain;
  return safe;
}

// Unified Data Access Layer (with auto fallback)
export const UserModel = {
  async findByEmail(email) {
    if (isConnectedToMongo()) {
      return await MongoUser.findOne({ email: email.toLowerCase() });
    } else {
      const users = LocalDB.read('users.json');
      return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async findById(id) {
    if (isConnectedToMongo()) {
      return await MongoUser.findById(id).select('-password -otpHash -otpExpiry');
    } else {
      const users = LocalDB.read('users.json');
      const user = users.find(u => u._id === id);
      return sanitizeUser(user);
    }
  },

  async create(userData) {
    if (isConnectedToMongo()) {
      const user = new MongoUser({
        ...userData,
        email: userData.email.toLowerCase()
      });
      const saved = await user.save();
      return sanitizeUser(saved);
    } else {
      const users = LocalDB.read('users.json');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = {
        _id: 'u_' + Math.random().toString(36).substr(2, 9),
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'user',
        rewardPoints: 0,
        otpHash: null,
        otpExpiry: null,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      LocalDB.write('users.json', users);

      return sanitizeUser(newUser);
    }
  },

  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },

  async saveOtp(email, otp, expiryMinutes = 10) {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const otpExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const normalizedEmail = email.toLowerCase();

    // Existing user: store OTP on user record
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      if (isConnectedToMongo()) {
        const user = await MongoUser.findOneAndUpdate(
          { email: normalizedEmail },
          { otpHash, otpExpiry },
          { new: true }
        );
        return { isNewUser: false, user: sanitizeUser(user) };
      }
      const users = LocalDB.read('users.json');
      const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      users[index].otpHash = otpHash;
      users[index].otpExpiry = otpExpiry.toISOString();
      LocalDB.write('users.json', users);
      return { isNewUser: false, user: sanitizeUser(users[index]) };
    }

    // First-time: store OTP in pending_otps until verified
    if (isConnectedToMongo()) {
      await MongoPendingOtp.findOneAndUpdate(
        { email: normalizedEmail },
        { email: normalizedEmail, otpHash, otpExpiry, createdAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return { isNewUser: true, user: null };
    }

    const pending = LocalDB.read('pending_otps.json', []);
    const filtered = pending.filter(p => p.email !== normalizedEmail);
    filtered.push({
      email: normalizedEmail,
      otpHash,
      otpExpiry: otpExpiry.toISOString(),
      createdAt: new Date().toISOString()
    });
    LocalDB.write('pending_otps.json', filtered);
    return { isNewUser: true, user: null };
  },

  async verifyOtp(email, otp, name) {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      if (!existing.otpHash || !existing.otpExpiry) {
        return { valid: false, reason: 'No OTP requested for this email.' };
      }

      const expiry = new Date(existing.otpExpiry);
      if (Date.now() > expiry.getTime()) {
        await this.clearOtp(normalizedEmail);
        return { valid: false, reason: 'OTP has expired. Please request a new one.' };
      }

      const match = await bcrypt.compare(otp, existing.otpHash);
      if (!match) {
        return { valid: false, reason: 'Invalid OTP.' };
      }

      await this.clearOtp(normalizedEmail);
      return { valid: true, isNewUser: false, user: existing };
    }

    // First-time login: check pending OTP store
    const record = isConnectedToMongo()
      ? await MongoPendingOtp.findOne({ email: normalizedEmail })
      : LocalDB.read('pending_otps.json', []).find(p => p.email === normalizedEmail);
    if (!record) {
      return { valid: false, reason: 'No OTP requested for this email.' };
    }

    if (Date.now() > new Date(record.otpExpiry).getTime()) {
      await this.clearPendingOtp(normalizedEmail);
      return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      return { valid: false, reason: 'Invalid OTP.' };
    }

    const displayName =
      (name && String(name).trim()) ||
      normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Create account on first successful OTP verify
    const randomPassword = cryptoRandomPassword();
    const user = await this.create({
      name: displayName,
      email: normalizedEmail,
      password: randomPassword,
      role: 'user'
    });

    await this.clearPendingOtp(normalizedEmail);
    return { valid: true, isNewUser: true, user };
  },

  async clearPendingOtp(email) {
    if (isConnectedToMongo()) {
      await MongoPendingOtp.deleteOne({ email: email.toLowerCase() });
      return;
    }
    const pending = LocalDB.read('pending_otps.json', []);
    LocalDB.write(
      'pending_otps.json',
      pending.filter(p => p.email !== email.toLowerCase())
    );
  },

  async clearOtp(email) {
    const normalizedEmail = email.toLowerCase();
    if (isConnectedToMongo()) {
      await MongoUser.findOneAndUpdate(
        { email: normalizedEmail },
        { otpHash: null, otpExpiry: null }
      );
    } else {
      const users = LocalDB.read('users.json');
      const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (index !== -1) {
        users[index].otpHash = null;
        users[index].otpExpiry = null;
        LocalDB.write('users.json', users);
      }
    }
    this.clearPendingOtp(normalizedEmail);
  },

  async updatePassword(email, newPassword) {
    const normalizedEmail = email.toLowerCase();
    if (isConnectedToMongo()) {
      const user = await MongoUser.findOne({ email: normalizedEmail });
      if (!user) return null;
      user.password = newPassword;
      user.otpHash = null;
      user.otpExpiry = null;
      const updated = await user.save();
      return sanitizeUser(updated);
    } else {
      const users = LocalDB.read('users.json');
      const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      if (index === -1) return null;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      users[index].password = hashedPassword;
      users[index].otpHash = null;
      users[index].otpExpiry = null;
      LocalDB.write('users.json', users);
      return sanitizeUser(users[index]);
    }
  },

  async addRewardPoints(userId, points) {
    if (isConnectedToMongo()) {
      const user = await MongoUser.findById(userId);
      if (!user) return null;
      user.rewardPoints = (user.rewardPoints || 0) + points;
      return await user.save();
    } else {
      const users = LocalDB.read('users.json');
      const index = users.findIndex(u => u._id === userId);
      if (index === -1) return null;
      users[index].rewardPoints = (users[index].rewardPoints || 0) + points;
      LocalDB.write('users.json', users);
      return users[index];
    }
  }
};
