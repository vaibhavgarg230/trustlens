require('dotenv').config();
// trustlens/backend/scripts/fixAndLogStringQuantities.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens';

async function fixAndLogStringQuantities() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const collectionsToCheck = ['products', 'product'];
    for (const collName of collectionsToCheck) {
      const Coll = mongoose.connection.collection(collName);
      const products = await Coll.find({ quantity: { $type: 'string' } }).toArray();
      if (products.length === 0) {
        console.log(`No products with string quantity found in collection '${collName}'.`);
      } else {
        console.log(`Products with string quantity BEFORE fix in collection '${collName}':`);
        products.forEach(p => {
          console.log(`_id: ${p._id}, name: ${p.name}, quantity: '${p.quantity}'`);
        });
        // Step 1: Trim whitespace/newlines from quantity
        const trimResult = await Coll.updateMany(
          { quantity: { $type: 'string' } },
          [ { $set: { quantity: { $trim: { input: "$quantity" } } } } ]
        );
        console.log(`Trimmed whitespace/newlines from ${trimResult.modifiedCount} products in collection '${collName}'.`);
        // Step 2: Convert to integer
        const intResult = await Coll.updateMany(
          { quantity: { $type: 'string' } },
          [ { $set: { quantity: { $toInt: "$quantity" } } } ]
        );
        console.log(`Converted ${intResult.modifiedCount} products to integer in collection '${collName}'.`);
        // Show after
        const after = await Coll.find({ quantity: { $type: 'string' } }).toArray();
        if (after.length === 0) {
          console.log(`All string quantities fixed in collection '${collName}'!`);
        } else {
          console.log(`Products with string quantity AFTER fix in collection '${collName}':`);
          after.forEach(p => {
            console.log(`_id: ${p._id}, name: ${p.name}, quantity: '${p.quantity}'`);
          });
        }
      }
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error fixing products:', err);
    process.exit(1);
  }
}

fixAndLogStringQuantities(); 