import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  country:    { type: String, required: true },
  activationCode: { type: String },
  isVerified: { type: Boolean, default: false },
  role:       { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

// ✅ THIS LINE IS IMPORTANT
export default mongoose.models.User || mongoose.model('User', userSchema);
