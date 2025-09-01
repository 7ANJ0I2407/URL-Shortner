import mongoose from 'mongoose';

/**
 * Click analytics (stored only when analyticsEnabled=true)
 */
const clickEventSchema = new mongoose.Schema(
  {
    time: { type: Date, default: Date.now },
    ip: String,
    referrer: String,
    userAgent: String,
    country: String, // optional – fill if you add a geo service/proxy headers
    city: String,    // optional
  },
  { _id: false }
);

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
    },
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // When the short link was created
    createdAt: {
      type: Date,
      default: Date.now,
    },

    /**
     * Per-document TTL:
     * If set, MongoDB will delete the doc at this exact time.
     * Leave empty for "no expiry".
     */
    expiresAt: {
      type: Date,
      default: null,
    },

    // Whether redirects should be served (lets you disable without deleting)
    isActive: {
      type: Boolean,
      default: true,
    },

    // Whether to store analytics for this short link
    analyticsEnabled: {
      type: Boolean,
      default: true,
    },

    // Aggregate total clicks
    clickCount: {
      type: Number,
      default: 0,
    },

    // Detailed events (one entry per click if analyticsEnabled)
    events: {
      type: [clickEventSchema],
      default: [],
    },
  },
  { versionKey: false }
);

/** TTL index for per-link expiry.
 *  expireAfterSeconds: 0 means "expire exactly at expiresAt".
 *  Docs without expiresAt are ignored by TTL, so "no expiry" works.
 */
urlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Url = mongoose.model('Url', urlSchema);
export default Url;
