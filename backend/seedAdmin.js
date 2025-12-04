// backend/seedAdmin.js
require('dotenv').config();            // loads MONGO_URI from your .env
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Admin    = require('./models/Admin');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Default admin credentials (matching README)
    const username = "admin@trustlens.com";
    const email = "admin@trustlens.com";
    const password = "admin123";

    // hash the password
    const hash = await bcrypt.hash(password, 12);

    // create or upsert the admin user
    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      console.log('⚠️  Admin already exists – skipping creation');
    } else {
      await Admin.create({ username, email, password: hash });
      console.log(`✅ Admin user "${username}" created with password "${password}"`);
    }
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();
