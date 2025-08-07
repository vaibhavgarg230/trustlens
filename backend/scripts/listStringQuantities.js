// trustlens/backend/scripts/listStringQuantities.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens';

async function listStringQuantities() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const Product = mongoose.connection.collection('products');
    const products = await Product.find({ quantity: { $type: 'string' } }).toArray();
    if (products.length === 0) {
      console.log('No products with string quantity found.');
    } else {
      console.log('Products with string quantity:');
      products.forEach(p => {
        console.log(`_id: ${p._id}, name: ${p.name}, quantity: ${p.quantity}`);
      });
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing products:', err);
    process.exit(1);
  }
}

listStringQuantities(); 