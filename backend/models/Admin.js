// backend/models/Admin.js
const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, sparse: true }, // Optional email field
  password: { type: String, required: true }
});
module.exports = mongoose.model('Admin', adminSchema);
