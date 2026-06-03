const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    siteId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    visible: { type: Boolean, default: true },
    status: { type: String, default: 'published' },
    availability: { type: String, default: 'available' },
    stock: { type: String, default: '' },
    badge: { type: String, default: '' },
    oldPrice: { type: String, default: '' },
    variantInfo: { type: String, default: '' },
    extraInfo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: false },
)

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema)
