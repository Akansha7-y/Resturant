import express from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/userModel.js';
import { sendOtpEmail, isEmailConfigured } from '../utils/emailService.js';
import { 
  signToken, 
  authenticateToken, 
  requireAdmin, 
  requireOwner, 
  authorizeRoles 
} from '../middleware/authMiddleware.js';

const router = express.Router();
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;

// Lightweight per-process throttling. Use a shared Redis store when running
// multiple API instances so limits are consistent across replicas.
const rateBuckets = new Map();
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}
const standardAuthLimit = rateLimit({ max: 20 });
const otpRequestLimit = rateLimit({ max: 3 });
const otpVerifyLimit = rateLimit({ max: 5 });

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    rewardPoints: user.rewardPoints || 0
  };
}

function generateOtp() {
  // Cryptographically secure 6-digit OTP
  return String(crypto.randomInt(100000, 1000000));
}

// Strict email validation — OTP only sent to well-formed addresses
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // RFC-inspired practical pattern: local@domain.tld
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) return false;
  const [local, domain] = trimmed.split('@');
  if (!local || !domain || local.length > 64) return false;
  if (!domain.includes('.')) return false;
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) return false;
  return true;
}

// @route   POST api/auth/register
// @desc    Register a new user & issue JWT
router.post('/register', standardAuthLimit, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const userExists = await UserModel.findByEmail(email);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const user = await UserModel.create({
      name,
      email,
      password,
      role: 'user'
    });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: userResponse(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// @route   POST api/auth/login
// @desc    Login with email/password & issue JWT
router.post('/login', standardAuthLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await UserModel.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = signToken(user);

    res.json({
      token,
      user: userResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   POST api/auth/send-otp
// @desc    Send OTP to a valid email inbox (works for new + existing users)
router.post('/send-otp', otpRequestLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address. OTP is only sent to valid emails.' });
    }

    const otp = generateOtp();
    const { isNewUser } = await UserModel.saveOtp(normalizedEmail, otp, OTP_EXPIRY_MINUTES);

    let emailResult = { simulated: false, otp };
    try {
      emailResult = await sendOtpEmail(normalizedEmail, otp, OTP_EXPIRY_MINUTES);
    } catch (mailError) {
      console.warn('Live email dispatch failed, falling back to local OTP server:', mailError.message);
      console.log(`\n======================================================`);
      console.log(`🔑 [OTP SERVER (Fallback Delivery)]`);
      console.log(`📨 Sent To:    ${normalizedEmail}`);
      console.log(`🔢 OTP Code:   ${otp}`);
      console.log(`⏳ Valid For:  ${OTP_EXPIRY_MINUTES} minutes`);
      console.log(`======================================================\n`);
      emailResult = { simulated: true, otp };
    }

    console.log(`[OTP] Handled for ${normalizedEmail}${isNewUser ? ' [first-time user]' : ''}`);

    res.json({
      success: true,
      isNewUser,
      simulated: emailResult.simulated,
      message: emailResult.simulated
        ? 'Email delivery is unavailable. Please try again later or contact support.'
        : (isNewUser
            ? `OTP sent to ${normalizedEmail}. Check your inbox to create your account.`
            : `OTP sent to ${normalizedEmail}. Check your inbox — valid for ${OTP_EXPIRY_MINUTES} minutes.`),
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error sending OTP.' });
  }
});

// @route   POST api/auth/verify-otp
// @desc    Verify OTP; create account on first-time login, then issue JWT
router.post('/verify-otp', otpVerifyLimit, async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({ message: 'OTP must be a 6-digit code.' });
    }

    const result = await UserModel.verifyOtp(normalizedEmail, String(otp).trim(), name);
    if (!result.valid) {
      return res.status(400).json({ message: result.reason });
    }

    const token = signToken(result.user);

    res.json({
      token,
      isNewUser: Boolean(result.isNewUser),
      user: userResponse(result.user)
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP.' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Initiate password reset: verify user exists and send secure reset OTP
router.post('/forgot-password', otpRequestLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide your registered email address.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (!existingUser) {
      return res.status(404).json({ message: 'No registered account found with this email address.' });
    }

    const otp = generateOtp();
    await UserModel.saveOtp(normalizedEmail, otp, OTP_EXPIRY_MINUTES);

    let emailResult = { simulated: false, otp };
    try {
      emailResult = await sendOtpEmail(normalizedEmail, otp, OTP_EXPIRY_MINUTES);
    } catch (mailError) {
      console.warn('Live reset email delivery failed, using local OTP server fallback:', mailError.message);
      console.log(`\n======================================================`);
      console.log(`🔑 [PASSWORD RESET OTP]`);
      console.log(`📨 Sent To:    ${normalizedEmail}`);
      console.log(`🔢 Reset Code: ${otp}`);
      console.log(`⏳ Valid For:  ${OTP_EXPIRY_MINUTES} minutes`);
      console.log(`======================================================\n`);
      emailResult = { simulated: true, otp };
    }

    console.log(`[PASSWORD RESET] Requested for ${normalizedEmail}`);

    res.json({
      success: true,
      simulated: emailResult.simulated,
      message: emailResult.simulated
        ? 'Email delivery is unavailable. Please try again later or contact support.'
        : 'A password reset code has been sent to your registered email address.',
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing password reset request.' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Verify OTP and reset account password, then issue new JWT session
router.post('/reset-password', otpVerifyLimit, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, reset code, and new password.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({ message: 'Reset code must be a 6-digit number.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const verifyResult = await UserModel.verifyOtp(normalizedEmail, String(otp).trim());
    if (!verifyResult.valid) {
      return res.status(400).json({ message: verifyResult.reason || 'Invalid or expired reset code.' });
    }

    const updatedUser = await UserModel.updatePassword(normalizedEmail, newPassword);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User account could not be found to update.' });
    }

    const token = signToken(updatedUser);

    console.log(`[PASSWORD RESET] Successfully updated password for ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.',
      token,
      user: userResponse(updatedUser)
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user from JWT
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: userResponse(user) });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Server error retrieving profile.' });
  }
});

// @route   GET api/auth/verify
// @desc    Fast verification of JWT token without DB hit
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Re-export auth middleware for seamless compatibility across routes
export {
  authenticateToken,
  requireAdmin,
  requireOwner,
  authorizeRoles,
  signToken
};

export default router;

