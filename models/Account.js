import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  accountId: {
  type: String,
  unique: true,
  required: false
},
  rank: {
    type: String,
    required: true,
    enum: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant']
  },
  rankTier: {
    type: String,
    enum: ['1', '2', '3'],
    default: '1'
  },
  region: {
    type: String,
    required: true,
    enum: ['NA', 'EU', 'AP', 'KR', 'BR', 'LATAM', 'TR', 'ME']
  },
  price: {
    type: Number,
    required: true
  },
  skins: [{
    type: String
  }],
  skinCount: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  agentCount: {
    type: Number,
    default: 0
  },
  images: [{
    url: String,
    publicId: String
  }],
  description: {
    type: String,
    default: ''
  },
  highlights: [{
    type: String
  }],
  isSold: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Auto-generate accountId
accountSchema.pre('save', async function (next) {
  if (!this.accountId) {
    const count = await mongoose.model('Account').countDocuments();
    this.accountId = `VAL-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

accountSchema.pre('insertMany', async function (next, docs) {
  const count = await mongoose.model('Account').countDocuments();
  docs.forEach((doc, i) => {
    if (!doc.accountId) {
      doc.accountId = `VAL-${String(count + i + 1).padStart(4, '0')}`;
    }
  });
  next();
});

export default mongoose.model('Account', accountSchema);
