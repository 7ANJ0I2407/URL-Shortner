import mongoose from 'mongoose';

const clickEventSchema = new mongoose.Schema(
  {
    time: { type: Date, default: Date.now },
    ip: String,
    referrer: String,
    userAgent: String,
    country: String,
    city: String,
  },
  { _id: false }
);

const urlSchema = new mongoose.Schema(
  {
    originalUrl: { type: String, required: true },
    shortId: { type: String, required: true, unique: true, index: true },

    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // null => no expiry
    isActive: { type: Boolean, default: true },

    analyticsEnabled: { type: Boolean, default: true },
    clickCount: { type: Number, default: 0 },
    events: { type: [clickEventSchema], default: [] },

    // Password protection
    passwordProtected: { type: Boolean, default: false },
    passwordHash: { type: String, select: false, default: null },
  },
  { versionKey: false }
);

// TTL: expire exactly at expiresAt (ignored if expiresAt is null)
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Url = mongoose.model('Url', urlSchema);
export default Url;
