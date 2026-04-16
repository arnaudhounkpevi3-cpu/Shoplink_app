const mongoose = require('mongoose')

const siteSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    slogan: { type: String, default: '' },
    logo: { type: String, default: '' },
    description: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    secondaryPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    activityType: { type: String, default: 'Boutique' },
    primaryColor: { type: String, default: '#d9643a' },
    secondaryColor: { type: String, default: '#176b5b' },
    status: { type: String, default: 'draft' },
    createdAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    updatedAt: { type: Date },
  },
  { _id: false },
)

module.exports = mongoose.models.Site || mongoose.model('Site', siteSchema)
