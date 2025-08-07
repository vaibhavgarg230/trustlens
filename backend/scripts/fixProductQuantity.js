// trustlens/backend/scripts/fixProductQuantity.js
const mongoose = require('mongoose');

// TODO: Replace with your actual MongoDB connection string if different
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens';

async function fixProductQuantities() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const Product = mongoose.connection.collection('products');
    const result = await Product.updateMany(
      { quantity: { $type: 'string' } },
      [ { $set: { quantity: { $toInt: '$quantity' } } } ]
    );
    console.log(`Updated ${result.modifiedCount} products.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error updating product quantities:', err);
    process.exit(1);
  }
}

fixProductQuantities(); 