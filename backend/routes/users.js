const express = require('express')
const bcrypt = require('bcryptjs')

const { repo } = require('../data/repository')
const { requireAuth } = require('../middleware/auth')
const { sanitizeUser } = require('../utils/sanitizeUser')

const router = express.Router()

// GET user's premium project
router.get('/premium/my-project', requireAuth, async (req, res) => {
  try {
    // Use Supabase-specific function if available
    if (repo().getMyPremiumProject) {
      return repo().getMyPremiumProject(req.user.id)
    }
    
    // Fallback for MongoDB/JSON
    res.json({
      success: false,
      project: null
    })
  } catch (error) {
    console.error('Error fetching premium project:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching premium project',
    })
  }
})

// PUT update user profile
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body
    const userId = req.params.id

    // Users can only update their own profile (unless admin)
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que votre propre profil',
      })
    }

    const existingUser = await repo().findUserById(userId)
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      })
    }

    const updates = {}
    
    if (name) updates.name = name
    if (email) updates.email = String(email).toLowerCase()
    if (phone) updates.phone = phone
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10)
    }

    const updatedUser = await repo().updateUser(userId, updates)

    return res.json({
      success: true,
      message: 'Profil mis à jour',
      user: sanitizeUser(updatedUser),
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message,
    })
  }
})

module.exports = router
