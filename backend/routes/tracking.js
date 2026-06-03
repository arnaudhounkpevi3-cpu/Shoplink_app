const express = require('express');
const router = express.Router();
const { repo } = require('../data/repository');
const { requireAuth } = require('../middleware/auth');

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

function normalizeTrafficSource(value) {
  const source = String(value || 'direct')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (/whatsapp|wa|wapp/.test(source)) return 'whatsapp'
  if (/facebook|fb/.test(source)) return 'facebook'
  if (/instagram|insta|ig/.test(source)) return 'instagram'
  if (/sms|message|texto/.test(source)) return 'sms'
  return 'direct'
}

function getWeekInfo(date = new Date(), weekOffset = 0) {
  const base = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = base.getUTCDay() || 7
  base.setUTCDate(base.getUTCDate() - day + 1 + weekOffset * 7)
  const start = new Date(base)
  const end = new Date(base)
  end.setUTCDate(start.getUTCDate() + 6)

  const thursday = new Date(start)
  thursday.setUTCDate(start.getUTCDate() + 3)
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  const firstDay = firstThursday.getUTCDay() || 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 1)

  const weekNumber = Math.floor((thursday - firstThursday) / 604800000) + 1
  const year = thursday.getUTCFullYear()

  return { start, end, weekNumber, year }
}

function formatWeekPeriod(start, end) {
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' })
  return `${formatter.format(start)} - ${formatter.format(end)} ${end.getUTCFullYear()}`
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || '')
    .split(',')[0]
    .trim()
}

async function assertCanReadSite(req, res, siteId) {
  const site = await repo().findSiteById(siteId)
  if (!site) {
    res.status(404).json({ success: false, message: 'Site introuvable' })
    return null
  }
  if (req.user.role !== 'admin' && site.userId !== req.user.id) {
    res.status(403).json({ success: false, message: 'Accès non autorisé à ces statistiques' })
    return null
  }
  return site
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

// Official site view: 1 unique visit per visitor per day.
router.post('/site-visit', async (req, res) => {
  try {
    const { siteId, visitorId, source } = req.body;
    if (!siteId) return res.status(400).json({ success: false, message: 'siteId requis' });

    const site = await repo().findSiteById(siteId);
    if (!site) return res.status(404).json({ success: false, message: 'Site introuvable' });

    const week = getWeekInfo();
    const visit = await repo().addSiteVisit({
      id: trackingId(),
      siteId,
      userId: site.userId,
      source: normalizeTrafficSource(source),
      visitorId: visitorId || clientIp(req) || 'anonymous',
      ipAddress: clientIp(req),
      weekNumber: week.weekNumber,
      year: week.year,
      visitedAt: new Date().toISOString(),
    });

    return res.json({ success: true, duplicate: Boolean(visit.duplicate) });
  } catch (error) {
    console.error('Error tracking official site visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Official product event: view is unique per visitor/product/day, add_to_cart is counted every click.
router.post('/product-event', async (req, res) => {
  try {
    const { siteId, productId, visitorId, eventType } = req.body;
    if (!siteId || !productId) return res.status(400).json({ success: false, message: 'siteId et productId requis' });
    if (!['view', 'add_to_cart'].includes(eventType)) return res.status(400).json({ success: false, message: 'eventType invalide' });

    const site = await repo().findSiteById(siteId);
    if (!site) return res.status(404).json({ success: false, message: 'Site introuvable' });

    const week = getWeekInfo();
    const event = await repo().addProductEvent({
      id: trackingId(),
      siteId,
      userId: site.userId,
      productId,
      eventType,
      visitorId: visitorId || clientIp(req) || 'anonymous',
      ipAddress: clientIp(req),
      weekNumber: week.weekNumber,
      year: week.year,
      createdAt: new Date().toISOString(),
    });

    return res.json({ success: true, duplicate: Boolean(event.duplicate) });
  } catch (error) {
    console.error('Error tracking official product event:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Track weekly public link traffic by source.
router.post('/link-visit', async (req, res) => {
  try {
    const { siteId, source } = req.body;
    if (!siteId) return res.status(400).json({ success: false, message: 'siteId requis' });

    const site = await repo().findSiteById(siteId);
    if (!site) return res.status(404).json({ success: false, message: 'Site introuvable' });

    const week = getWeekInfo();
    await repo().addLinkVisit({
      id: trackingId(),
      siteId,
      userId: site.userId,
      source: normalizeTrafficSource(source),
      weekNumber: week.weekNumber,
      year: week.year,
      visitedAt: new Date().toISOString(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error tracking weekly link visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/weekly/:siteId', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const weekOffset = Number(req.query.weekOffset || 0);
    const site = await assertCanReadSite(req, res, siteId);
    if (!site) return;

    const week = getWeekInfo(new Date(), Number.isFinite(weekOffset) ? weekOffset : 0);
    const [linkVisits, siteVisits, productEvents, products, ordersForWeek] = await Promise.all([
      repo().getLinkVisitsBySiteWeek(siteId, week.weekNumber, week.year),
      repo().getSiteVisitsBySiteWeek ? repo().getSiteVisitsBySiteWeek(siteId, week.weekNumber, week.year) : Promise.resolve([]),
      repo().getProductEventsBySiteWeek ? repo().getProductEventsBySiteWeek(siteId, week.weekNumber, week.year) : Promise.resolve([]),
      repo().listProductsBySiteId(siteId),
      repo().listOrdersBySiteId ? repo().listOrdersBySiteId(siteId) : Promise.resolve([]),
    ]);
    const counts = { whatsapp: 0, facebook: 0, instagram: 0, sms: 0, direct: 0 };

    const trafficRows = siteVisits.length ? siteVisits : linkVisits;
    trafficRows.forEach((visit) => {
      const source = normalizeTrafficSource(visit.source);
      counts[source] = (counts[source] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
    const order = ['whatsapp', 'facebook', 'instagram', 'sms', 'direct'];
    let remaining = 100;
    const sources = order.map((source, index) => {
      const count = Number(counts[source] || 0);
      let percent = total ? Math.round((count / total) * 100) : 0;
      if (total && index === order.length - 1) percent = Math.max(0, remaining);
      else remaining -= percent;
      return { source, count, percent };
    });

    const productById = new Map(products.map((product) => [String(product.id), product]));
    const productViewsMap = {};
    const productAddsMap = {};
    const productOrdersMap = {};

    productEvents.forEach((event) => {
      const key = String(event.productId || '');
      if (!key) return;
      if (event.eventType === 'view') productViewsMap[key] = (productViewsMap[key] || 0) + 1;
      if (event.eventType === 'add_to_cart') productAddsMap[key] = (productAddsMap[key] || 0) + 1;
    });

    const startMs = week.start.getTime();
    const endMs = new Date(week.end).setUTCHours(23, 59, 59, 999);
    const weeklyOrders = (ordersForWeek || []).filter((order) => {
      const createdAt = new Date(order.createdAt || 0).getTime();
      return createdAt >= startMs && createdAt <= endMs;
    });

    weeklyOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = String(item.productId || '');
        if (!key) return;
        productOrdersMap[key] = (productOrdersMap[key] || 0) + Number(item.quantity || 1);
      });
    });

    const topProducts = Array.from(productById.values())
      .map((product) => {
        const id = String(product.id);
        const views = Number(productViewsMap[id] || 0);
        const orders = Number(productOrdersMap[id] || 0);
        return { id, name: product.name, views, adds: orders, orders, score: views + orders * 2 };
      })
      .filter((product) => product.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const uniqueVisitors = new Set(siteVisits.map((visit) => visit.visitorId || visit.ipAddress).filter(Boolean)).size;
    const addToCartTotal = Object.values(productAddsMap).reduce((sum, value) => sum + Number(value || 0), 0);
    const ordersTotal = weeklyOrders.length;

    return res.json({
      success: true,
      week: {
        weekNumber: week.weekNumber,
        year: week.year,
        weekOffset,
        period: formatWeekPeriod(week.start, week.end),
        isCurrent: weekOffset === 0,
      },
      total,
      sources,
      metrics: {
        siteViews: siteVisits.length,
        uniqueVisitors,
        productViewsTotal: Object.values(productViewsMap).reduce((sum, value) => sum + Number(value || 0), 0),
        addToCartTotal,
        ordersTotal,
      },
      topProducts,
      topProduct: topProducts[0] || null,
      productViews: productViewsMap,
      productAdds: productAddsMap,
      productOrders: productOrdersMap,
    });
  } catch (error) {
    console.error('Error getting weekly traffic stats:', error);
    return res.status(500).json({ success: false, message: error.message });
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
