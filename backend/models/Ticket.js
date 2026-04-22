const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status: { type: String, enum: ['open', 'pending', 'answered', 'closed'], default: 'open' },
  replies: [{
    message: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    role: { type: String, required: true },
    createdAt: { type: Date, required: true },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
})

ticketSchema.index({ userId: 1 })
ticketSchema.index({ status: 1 })
ticketSchema.index({ priority: 1 })
ticketSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Ticket', ticketSchema)
