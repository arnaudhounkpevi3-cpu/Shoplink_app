const express = require('express')

const { repo } = require('../data/repository')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.post('/', async (req, res) => {
  if (!repo().createClientEvent) {
    return res.status(501).json({
      success: false,
      message: 'Journal des actions indisponible',
    })
  }

  const event = await repo().createClientEvent(req.body || {})

  if (req.app.locals.notifyAdmins) {
    req.app.locals.notifyAdmins({
      type: 'client_event_created',
      event,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(201).json({
    success: true,
    event,
  })
})

router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100)
  const archived = req.query.archived === 'true'
  const events = repo().listClientEvents ? await repo().listClientEvents(limit, { archived }) : []
  return res.json({
    success: true,
    events,
    unreadCount: events.filter((event) => !event.read).length,
  })
})

router.patch('/admin/:id/archive', requireAuth, requireAdmin, async (req, res) => {
  if (!repo().archiveClientEvent) {
    return res.status(501).json({
      success: false,
      message: 'Archivage indisponible',
    })
  }

  const event = await repo().archiveClientEvent(req.params.id)
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Notification introuvable',
    })
  }

  return res.json({
    success: true,
    message: 'Notification archivee',
    event,
  })
})

router.post('/admin/archive-old', requireAuth, requireAdmin, async (_req, res) => {
  const archived = repo().archiveOldClientEvents ? await repo().archiveOldClientEvents(12) : []
  return res.json({
    success: true,
    archivedCount: archived.length,
  })
})

module.exports = router
