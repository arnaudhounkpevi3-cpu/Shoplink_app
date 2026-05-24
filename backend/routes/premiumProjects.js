const express = require('express')

const { repo } = require('../data/repository')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.post('/', async (req, res) => {
  const {
    company,
    manager,
    whatsapp,
    email,
    activity,
    style,
    delai,
    siteType,
    totalPrice,
    amount,
    products,
  } = req.body || {}

  if (!company || !manager || !whatsapp || !activity) {
    return res.status(400).json({
      success: false,
      message: 'company, manager, whatsapp et activity sont obligatoires',
    })
  }

  if (!repo().createPremiumProject) {
    return res.status(501).json({
      success: false,
      message: 'La creation de projet premium n est pas disponible avec ce stockage',
    })
  }

  const project = await repo().createPremiumProject({
    company,
    manager,
    whatsapp,
    email,
    activity,
    style,
    delai,
    siteType,
    totalPrice,
    amount,
    products,
    payload: req.body,
  })

  if (req.app.locals.notifyAdmins) {
    req.app.locals.notifyAdmins({
      type: 'premium_project_created',
      event: 'Nouvelle demande Premium',
      project,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Demande Premium envoyee a l administrateur',
    project,
  })
})

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!repo().updatePremiumProject) {
    return res.status(501).json({
      success: false,
      message: 'Le suivi des projets premium n est pas disponible avec ce stockage',
    })
  }

  const allowedStatuses = [
    'pending',
    'deposit_paid',
    'in_progress',
    'waiting_client_validation',
    'waiting_balance',
    'delivered',
    'completed',
    'cancelled',
  ]

  const patch = {}
  const {
    status,
    progress,
    depositPaid,
    balancePaid,
    adminNote,
    deliveryUrl,
    cancellationReason,
  } = req.body || {}

  if (status !== undefined) {
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut premium invalide',
      })
    }
    patch.status = status
  }

  if (progress !== undefined) {
    const numericProgress = Number(progress)
    if (!Number.isFinite(numericProgress) || numericProgress < 0 || numericProgress > 100) {
      return res.status(400).json({
        success: false,
        message: 'progress doit etre entre 0 et 100',
      })
    }
    patch.progress = numericProgress
  }

  if (depositPaid !== undefined) patch.depositPaid = Boolean(depositPaid)
  if (balancePaid !== undefined) patch.balancePaid = Boolean(balancePaid)
  if (adminNote !== undefined) patch.adminNote = String(adminNote || '').trim()
  if (deliveryUrl !== undefined) patch.deliveryUrl = String(deliveryUrl || '').trim()
  if (cancellationReason !== undefined) patch.cancellationReason = String(cancellationReason || '').trim()

  const project = await repo().updatePremiumProject(req.params.id, patch)
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Projet premium introuvable',
    })
  }

  if (req.app.locals.notifyAdmins) {
    req.app.locals.notifyAdmins({
      type: 'premium_project_updated',
      event: 'Projet Premium mis a jour',
      project,
      timestamp: new Date().toISOString(),
    })
  }

  return res.json({
    success: true,
    message: 'Projet premium mis a jour',
    project,
  })
})

module.exports = router
