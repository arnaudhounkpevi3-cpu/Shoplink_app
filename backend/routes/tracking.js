const express = require('express');
const router = express.Router();
const { repo } = require('../data/repository');

function trackingId() {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function eventTime(event) {
  return event.timestamp || event.createdAt || new Date().toISOString();
}

function sourceFromEvent(event) {
  if (event.platform) return event.platform;
  if (event.referrer && String(event.referrer).includes('wa.me')) return 'whatsapp_shared_link';
  if (event.referrer) return 'shared';
  return 'direct';
}

function parseTrackingBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (_error) {
      return {}
    }
  }
  return req.body
}

// Track site visit
router.post('/visit', async (req, res) => {
  try {
    const { siteId, productId, sessionId, visitorId, referrer, userAgent, platform } = req.body;
    
    const trackingEvent = {
      id: trackingId(),
      siteId,
      productId: productId || null,
      sessionId: sessionId || null,
      visitorId: visitorId || null,
      referrer: referrer || null,
      userAgent: userAgent || null,
      platform: platform || null,
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
    const { siteId, productId, sessionId, visitorId, platform } = req.body;
    
    const trackingEvent = {
      id: trackingId(),
      siteId,
      productId: productId || null,
      sessionId: sessionId || null,
      visitorId: visitorId || null,
      platform: platform || null,
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
    const products = await repo().listProductsBySiteId(siteId);
    const productById = new Map(products.map(product => [String(product.id), product]));
    
    const visits = tracking.filter(t => t.type === 'visit').length;
    const whatsappClicks = tracking.filter(t => t.type === 'whatsapp_click').length;
    
    // Product views
    const productViews = {};
    tracking.filter(t => t.type === 'product_view' && t.productId).forEach(t => {
      const key = String(t.productId);
      productViews[key] = (productViews[key] || 0) + 1;
    });

    const productOrders = {};
    tracking.filter(t => t.type === 'whatsapp_click' && t.productId).forEach(t => {
      const key = String(t.productId);
      productOrders[key] = (productOrders[key] || 0) + 1;
    });

    const sourceClicks = {};
    tracking.filter(t => t.type === 'visit').forEach(t => {
      const source = sourceFromEvent(t);
      sourceClicks[source] = (sourceClicks[source] || 0) + 1;
    });
    const shares = tracking.filter(t => t.type === 'link_share').length;
    
    // Unique visitors
    const uniqueVisitors = new Set(tracking.filter(t => t.visitorId).map(t => t.visitorId)).size;

    const rankedProducts = products
      .map(product => {
        const id = String(product.id);
        const views = Number(productViews[id] || 0);
        const orders = Number(productOrders[id] || 0);
        return { id, name: product.name, views, orders, score: views + orders * 2 };
      })
      .filter(product => product.score > 0)
      .sort((a, b) => b.score - a.score);

    const topProduct = rankedProducts[0]
      ? { id: rankedProducts[0].id, name: rankedProducts[0].name, views: rankedProducts[0].views, orders: rankedProducts[0].orders }
      : null;
    
    res.json({
      success: true,
      stats: {
        totalViews: visits,
        whatsappClicks,
        productViews,
        productOrders,
        topProduct,
        shares,
        sourceBreakdown: sourceClicks,
        sourceClicks,
        uniqueVisitors
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
        timestamp: eventTime(t),
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

// Track product view
router.post('/product-view', async (req, res) => {
  try {
    const { siteId, productId, sessionId, visitorId, platform } = req.body;
    
    const trackingEvent = {
      id: trackingId(),
      siteId,
      productId: productId || null,
      sessionId: sessionId || null,
      visitorId: visitorId || null,
      platform: platform || null,
      type: 'product_view',
      timestamp: new Date().toISOString()
    };
    
    await repo().addTracking(trackingEvent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track link share
router.post('/link-share', async (req, res) => {
  try {
    const { siteId, platform, sessionId, visitorId } = req.body;
    
    const trackingEvent = {
      id: trackingId(),
      siteId,
      platform: platform || null,
      sessionId: sessionId || null,
      visitorId: visitorId || null,
      type: 'link_share',
      timestamp: new Date().toISOString()
    };
    
    await repo().addTracking(trackingEvent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking link share:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Redirect through a tracked shared link before opening the public boutique.
router.get('/shared-link/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { target = '/', platform = 'shared' } = req.query;

    await repo().addTracking({
      id: trackingId(),
      siteId,
      platform,
      visitorId: req.query.visitorId || null,
      sessionId: req.query.sessionId || null,
      referrer: req.get('referer') || null,
      userAgent: req.get('user-agent') || null,
      type: 'link_share',
      timestamp: new Date().toISOString(),
    });

    return res.redirect(String(target));
  } catch (error) {
    console.error('Error tracking shared link:', error);
    return res.redirect(String(req.query.target || '/'));
  }
});

// Track time spent
router.post('/time-spent', async (req, res) => {
  try {
    const { siteId, timeSpent, sessionId, visitorId } = parseTrackingBody(req);
    if (!siteId) {
      return res.json({ success: true, skipped: true });
    }
    
    const trackingEvent = {
      id: trackingId(),
      siteId,
      timeSpent: timeSpent || null,
      sessionId: sessionId || null,
      visitorId: visitorId || null,
      type: 'time_spent',
      timestamp: new Date().toISOString()
    };
    
    await repo().addTracking(trackingEvent);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking time spent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get timeline statistics
router.get('/stats/:siteId/timeline', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { period = '7d' } = req.query;
    
    const tracking = await repo().getTrackingBySite(siteId);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    
    // Group by day
    const timeline = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    tracking.forEach(t => {
      const date = new Date(t.timestamp);
      if (date < cutoffDate) return;
      
      const dateKey = date.toISOString().split('T')[0];
      if (!timeline[dateKey]) {
        timeline[dateKey] = { visits: 0, whatsappClicks: 0, productViews: 0 };
      }
      
      if (t.type === 'visit') timeline[dateKey].visits++;
      if (t.type === 'whatsapp_click') timeline[dateKey].whatsappClicks++;
      if (t.type === 'product_view') timeline[dateKey].productViews++;
    });
    
    res.json({
      success: true,
      timeline,
      period
    });
  } catch (error) {
    console.error('Error getting timeline stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get conversion statistics
router.get('/stats/:siteId/conversion', async (req, res) => {
  try {
    const { siteId } = req.params;
    const tracking = await repo().getTrackingBySite(siteId);
    
    // Calculate conversion rate
    const uniqueVisitors = new Set(tracking.filter(t => t.visitorId).map(t => t.visitorId)).size;
    const whatsappClicks = tracking.filter(t => t.type === 'whatsapp_click').length;
    
    const conversionRate = uniqueVisitors > 0 ? (whatsappClicks / uniqueVisitors) * 100 : 0;
    
    res.json({
      success: true,
      stats: {
        uniqueVisitors,
        whatsappClicks,
        conversionRate: conversionRate.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error getting conversion stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
