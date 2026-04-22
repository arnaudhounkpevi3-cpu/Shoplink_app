const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const { repo } = require('./data/repository');

const ADMIN_EMAIL = 'arnaudhounkpevi3@gmail.com';
const ADMIN_PASSWORD = '/Shoplink@2007';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoplink');
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await repo().findUserByEmail(ADMIN_EMAIL);

    if (existingAdmin) {
      console.log('Admin user already exists, updating...');
      
      // Update password and role
      const passwordHash = await bcryptjs.hash(ADMIN_PASSWORD, 10);
      
      const User = mongoose.model('User');
      await User.updateOne(
        { email: ADMIN_EMAIL.toLowerCase() },
        { 
          passwordHash,
          role: 'admin'
        }
      );
      
      console.log('Admin user updated successfully');
    } else {
      console.log('Creating new admin user...');
      
      // Create new admin user
      const passwordHash = await bcryptjs.hash(ADMIN_PASSWORD, 10);
      
      const adminUser = await repo().createUser({
        id: `user-admin-${Date.now()}`,
        name: 'Arnaud Hounkpevi',
        email: ADMIN_EMAIL,
        phone: '+22900000000',
        role: 'admin',
        passwordHash,
        createdAt: new Date().toISOString()
      });
      
      console.log('Admin user created successfully:', adminUser.email);
    }

    console.log('\nAdmin credentials:');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
    console.log('Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
