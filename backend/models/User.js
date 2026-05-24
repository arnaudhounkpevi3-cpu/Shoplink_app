const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: '' },
    role: { type: String, default: 'user' },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

module.exports = mongoose.models.User || mongoose.model('User', userSchema)
