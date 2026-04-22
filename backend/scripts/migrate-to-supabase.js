const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

// Load state.json
const statePath = path.join(__dirname, '../data/state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

async function migrateUsers() {
  console.log('Migrating users...');
  for (const user of state.users) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.passwordHash,
        phone: user.phone,
        role: user.role,
        is_active: true,
        created_at: user.createdAt,
        updated_at: user.createdAt
      })
      .select();
    
    if (error) {
      console.error(`Error migrating user ${user.email}:`, error.message);
    } else {
      console.log(`Migrated user: ${user.email}`);
    }
  }
  console.log('Users migration completed');
}

async function migrateSites() {
  console.log('Migrating sites...');
  for (const site of state.sites) {
    const { data, error } = await supabase
      .from('sites')
      .insert({
        id: site.id,
        user_id: site.userId,
        name: site.name,
        slug: site.slug,
        slogan: site.slogan || '',
        description: site.description || '',
        activity_type: (site.activityType || 'boutique').toLowerCase(),
        whatsapp: site.whatsapp || '',
        phone2: site.secondaryPhone || '',
        address: site.address || '',
        city: site.city || '',
        logo_url: site.logo || '',
        primary_color: site.primaryColor || '#1a5c38',
        status: site.status || 'draft',
        type: site.type || 'autonome',
        views: site.views || 0,
        whatsapp_clicks: site.whatsappClicks || 0,
        published_at: site.publishedAt || null,
        created_at: site.createdAt,
        updated_at: site.updatedAt || site.createdAt
      })
      .select();
    
    if (error) {
      console.error(`Error migrating site ${site.slug}:`, error.message);
    } else {
      console.log(`Migrated site: ${site.slug}`);
    }
  }
  console.log('Sites migration completed');
}

async function migrateProducts() {
  console.log('Migrating products...');
  for (const product of state.products) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        id: product.id,
        site_id: product.siteId,
        user_id: product.userId,
        name: product.name,
        price: parseFloat(product.price),
        description: product.description || '',
        image_url: product.image || '',
        category: product.category || 'Général',
        is_visible: true,
        views: product.views || 0,
        whatsapp_clicks: product.whatsappClicks || 0,
        created_at: product.createdAt,
        updated_at: product.updatedAt || product.createdAt
      })
      .select();
    
    if (error) {
      console.error(`Error migrating product ${product.name}:`, error.message);
    } else {
      console.log(`Migrated product: ${product.name}`);
    }
  }
  console.log('Products migration completed');
}

async function migratePayments() {
  if (!state.payments || state.payments.length === 0) {
    console.log('No payments to migrate');
    return;
  }
  
  console.log('Migrating payments...');
  for (const payment of state.payments) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: payment.id,
        user_id: payment.userId,
        site_id: payment.siteId,
        type: payment.type,
        step: payment.step || 'full',
        amount: payment.amount,
        status: payment.status || 'pending',
        method: payment.method || 'fedapay',
        reference: payment.reference,
        admin_note: payment.adminNote || '',
        paid_at: payment.paidAt || null,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt || payment.createdAt
      })
      .select();
    
    if (error) {
      console.error(`Error migrating payment ${payment.reference}:`, error.message);
    } else {
      console.log(`Migrated payment: ${payment.reference}`);
    }
  }
  console.log('Payments migration completed');
}

async function migrateTracking() {
  if (!state.tracking || state.tracking.length === 0) {
    console.log('No tracking data to migrate');
    return;
  }
  
  console.log('Note: Tracking table not in Supabase schema. Skipping tracking migration.');
}

async function runMigration() {
  try {
    await migrateUsers();
    await migrateSites();
    await migrateProducts();
    await migratePayments();
    await migrateTracking();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
