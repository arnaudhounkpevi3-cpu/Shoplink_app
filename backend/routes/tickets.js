const express = require('express')

const { repo } = require('../data/repository')
const { attachUser, requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET all tickets (admin only)
router.get('/', async (_req, res) => {
  try {
    const tickets = await repo().listTickets()
    res.json({
      success: true,
      tickets,
      count: tickets.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets',
      error: error.message,
    })
  }
})

// GET tickets by user (user can see their own tickets)
router.get('/user/:userId', attachUser, async (req, res) => {
  try {
    const { userId } = req.params
    
    // Users can only see their own tickets
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      })
    }
    
    const tickets = await repo().findTicketsByUserId(userId)
    res.json({
      success: true,
      tickets,
      count: tickets.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets',
      error: error.message,
    })
  }
})

// POST create new ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const { subject, message, priority } = req.body
    
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Le sujet et le message sont obligatoires',
      })
    }
    
    const ticket = await repo().createTicket({
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      userEmail: req.user.email,
      subject,
      message,
      priority: priority || 'normal',
      status: 'open',
      createdAt: new Date().toISOString(),
    })
    
    res.status(201).json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du ticket',
      error: error.message,
    })
  }
})

// POST add reply to ticket
router.post('/:id/reply', requireAuth, async (req, res) => {
  try {
    const { message } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Le message est obligatoire',
      })
    }
    
    const ticket = await repo().findTicketById(req.params.id)
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable',
      })
    }
    
    // Users can only reply to their own tickets
    if (req.user.role !== 'admin' && ticket.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      })
    }
    
    const reply = {
      message,
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      role: req.user.role || 'user',
      createdAt: new Date().toISOString(),
    }
    
    const updatedTicket = await repo().addReplyToTicket(req.params.id, reply)
    
    // If admin replies, update status to 'answered'
    if (req.user.role === 'admin') {
      await repo().updateTicketStatus(req.params.id, 'answered')
    } else {
      // If user replies, update status to 'pending'
      await repo().updateTicketStatus(req.params.id, 'pending')
    }
    
    res.json({
      success: true,
      message: 'Réponse ajoutée',
      ticket: updatedTicket,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de la réponse',
      error: error.message,
    })
  }
})

// PUT update ticket status (admin only)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs',
      })
    }
    
    const { status } = req.body
    
    if (!['open', 'pending', 'answered', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
      })
    }
    
    const ticket = await repo().updateTicketStatus(req.params.id, status)
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable',
      })
    }
    
    res.json({
      success: true,
      message: 'Statut mis à jour',
      ticket,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message,
    })
  }
})

// DELETE ticket (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs',
      })
    }
    
    const deletedTicket = await repo().deleteTicket(req.params.id)
    
    if (!deletedTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket introuvable',
      })
    }
    
    res.json({
      success: true,
      message: 'Ticket supprimé',
      ticket: deletedTicket,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du ticket',
      error: error.message,
    })
  }
})

module.exports = router
