const express = require('express');
const router = express.Router();
const { repo } = require('../data/repository');

// Track site visit
router.post('/visit', async (req, res) => {
  try {
    const { siteId, productId } = req.body;
    
    const trackingEvent = {
      id: `track-${Date.now()}`,
      siteId,
      productId: productId || null,
      type: 'visit',
      timestamp: new Date().toISOString()
    };
    
    await repo().addTracking(trackingEvent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking visit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track WhatsApp click
router.post('/whatsapp-click', async (req, res) => {
  try {
    const { siteId, productId } = req.body;
    
    const trackingEvent = {
      id: `track-${Date.now()}`,
      siteId,
      productId: productId || null,
      type: 'whatsapp_click',
      timestamp: new Date().toISOString()
    };
    
    await repo().addTracking(trackingEvent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking WhatsApp click:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get site statistics
router.get('/stats/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const tracking = await repo().getTrackingBySite(siteId);
    
    const visits = tracking.filter(t => t.type === 'visit').length;
    const whatsappClicks = tracking.filter(t => t.type === 'whatsapp_click').length;
    
    // Product views
    const productViews = {};
    tracking.filter(t => t.type === 'visit' && t.productId).forEach(t => {
      productViews[t.productId] = (productViews[t.productId] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: {
        totalViews: visits,
        whatsappClicks,
        productViews
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get recent activity for a site
router.get('/activity/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const tracking = await repo().getTrackingBySite(siteId);
    
    // Get last 10 events, sorted by timestamp desc
    const recentActivity = tracking
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(t => ({
        type: t.type,
        timestamp: t.timestamp,
        productId: t.productId
      }));
    
    res.json({
      success: true,
      activity: recentActivity
    });
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
