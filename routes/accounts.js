import express from 'express';
import Account from '../models/Account.js';
import { protect } from '../middleware/auth.js';
import { upload, cloudinary } from '../middleware/cloudinary.js';

const router = express.Router();

// PUBLIC: Get all available accounts (with filters)
router.get('/', async (req, res) => {
  const { rank, region, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;
  const filter = { isSold: false };

  if (rank) filter.rank = rank;
  if (region) filter.region = region;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'rank') sortOption = { rank: 1 };

  const total = await Account.countDocuments(filter);
  const accounts = await Account.find(filter)
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ accounts, total, pages: Math.ceil(total / limit), page: Number(page) });
});

// PUBLIC: Get single account
router.get('/:id', async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });
  res.json(account);
});

// ADMIN: Get all accounts including sold
router.get('/admin/all', protect, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const total = await Account.countDocuments();
  const accounts = await Account.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ accounts, total, pages: Math.ceil(total / limit) });
});

// ADMIN: Create single account
router.post('/', protect, upload.array('images', 10), async (req, res) => {
  const { rank, rankTier, region, price, skins, skinCount, level, agentCount, description, highlights, isFeatured } = req.body;

  const images = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [];
  const skinsArray = skins ? (Array.isArray(skins) ? skins : JSON.parse(skins)) : [];
  const highlightsArray = highlights ? (Array.isArray(highlights) ? highlights : JSON.parse(highlights)) : [];

  const account = await Account.create({
    rank, rankTier, region,
    price: Number(price),
    skins: skinsArray,
    skinCount: Number(skinCount) || skinsArray.length,
    level: Number(level) || 1,
    agentCount: Number(agentCount) || 0,
    images,
    description,
    highlights: highlightsArray,
    isFeatured: isFeatured === 'true'
  });

  res.status(201).json(account);
});

// ADMIN: Bulk upload accounts (JSON body, no images)
router.post('/bulk', protect, async (req, res) => {
  const { accounts } = req.body;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ message: 'Provide an array of accounts' });
  }

  const created = await Account.insertMany(accounts);
  res.status(201).json({ created: created.length, accounts: created });
});

// ADMIN: Update account
router.put('/:id', protect, upload.array('images', 10), async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  const { rank, rankTier, region, price, skins, skinCount, level, agentCount, description, highlights, isFeatured, isSold, removeImages } = req.body;

  // Handle image removal
  if (removeImages) {
    const toRemove = Array.isArray(removeImages) ? removeImages : JSON.parse(removeImages);
    for (const publicId of toRemove) {
      await cloudinary.uploader.destroy(publicId);
    }
    account.images = account.images.filter(img => !toRemove.includes(img.publicId));
  }

  // Add new images
  if (req.files?.length) {
    const newImages = req.files.map(f => ({ url: f.path, publicId: f.filename }));
    account.images = [...account.images, ...newImages];
  }

  if (rank) account.rank = rank;
  if (rankTier) account.rankTier = rankTier;
  if (region) account.region = region;
  if (price) account.price = Number(price);
  if (skins) account.skins = Array.isArray(skins) ? skins : JSON.parse(skins);
  if (skinCount) account.skinCount = Number(skinCount);
  if (level) account.level = Number(level);
  if (agentCount) account.agentCount = Number(agentCount);
  if (description !== undefined) account.description = description;
  if (highlights) account.highlights = Array.isArray(highlights) ? highlights : JSON.parse(highlights);
  if (isFeatured !== undefined) account.isFeatured = isFeatured === 'true';
  if (isSold !== undefined) account.isSold = isSold === 'true';

  await account.save();
  res.json(account);
});

// ADMIN: Delete account
router.delete('/:id', protect, async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ message: 'Account not found' });

  // Delete images from Cloudinary
  for (const img of account.images) {
    if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
  }

  await account.deleteOne();
  res.json({ message: 'Account deleted' });
});

export default router;
