/**
 * Crée un compte administrateur en base MongoDB.
 * Usage: node scripts/createAdmin.js
 * Variables: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optionnel)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const User = require('../models/User')

const uri = process.env.MONGODB_URI || process.env.MONGO_URI
const email = (process.env.ADMIN_EMAIL || 'admin@shoplink.bj').toLowerCase()
const password = process.env.ADMIN_PASSWORD || 'ChangeMoi2026!'
const name = process.env.ADMIN_NAME || 'Administrateur ShopLink'

async function run() {
  if (!uri) {
    console.error('Définissez MONGODB_URI ou MONGO_URI dans backend/.env')
    process.exit(1)
  }

  await mongoose.connect(uri)

  const existing = await User.findOne({ email })
  if (existing) {
    console.log('Un utilisateur existe déjà avec cet email:', email)
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const id = `user-admin-${Date.now()}`

  await User.create({
    _id: id,
    name,
    email,
    phone: '',
    role: 'admin',
    passwordHash,
    createdAt: new Date(),
  })

  console.log('Admin créé:', email)
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
