import mongoose from 'mongoose';
import sharp from 'sharp';

// Users Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: Buffer },
  profilePictureSmall: { type: Buffer },
  firstName: { type: String, required: true },
  lastName: { type: String },
  age: { type: Number, min: 0 },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bio: { type: String, maxlength: 500 },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  currentSessionId: { type: String },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('profilePicture') && this.profilePicture) {
    try {
      this.profilePictureSmall = await sharp(this.profilePicture).resize(72, 72).toBuffer();
    } catch (err) {
      console.error('Error resizing profile picture:', err);
    }
  }
  next();
});

export default mongoose.model('User', userSchema);
