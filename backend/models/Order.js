const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, default: '' },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  reference: { type: String, unique: true, sparse: true },
  siteOrderNumber: { type: Number, default: null },
  siteId: { type: String, required: true, index: true },
  siteSlug: { type: String, default: '' },
  siteName: { type: String, default: '' },
  sellerUserId: { type: String, required: true, index: true },
  buyerName: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  buyerAddress: { type: String, default: '' },
  buyerNote: { type: String, default: '' },
  items: { type: [orderItemSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'FCFA' },
  source: { type: String, default: 'direct' },
  status: { type: String, default: 'pending_payment' },
  paymentStatus: { type: String, default: 'pending' },
  paymentMethod: { type: String, default: '' },
  payerName: { type: String, default: '' },
  payerPhone: { type: String, default: '' },
  transactionReference: { type: String, default: '' },
  paymentSubmittedAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationSource: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
})

orderSchema.index({ siteId: 1, createdAt: -1 })
orderSchema.index({ sellerUserId: 1, createdAt: -1 })

module.exports = mongoose.model('Order', orderSchema)
