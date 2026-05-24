const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    siteId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: false },
)

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema)
