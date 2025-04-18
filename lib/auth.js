// lib/auth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET; // set this in .env.local

export function signToken(user) {
  // include id so we can look it up later
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  // will throw if invalid/expired
  return jwt.verify(token, SECRET);
}
