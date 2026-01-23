import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Session ID generator
export const generateSessionId = () => uuidv4();

// User ID generator
export const generateUserId = () => uuidv4();

// Service ID generator
export const generateServiceId = () => uuidv4();

// Entitlement ID generator
export const generateEntitlementId = () => uuidv4();

// Sign JWT
export const generateToken = (payload: object, expiresIn = '30d') => {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions);
};

// Verify JWT
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate Auth Code
export const generateAuthCode = () => uuidv4();
