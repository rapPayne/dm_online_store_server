const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.json');

// Read database
const readDatabase = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], products: [], orders: [] };
  }
};

// Write database
const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Get next order number
const getNextOrderNumber = () => {
  const db = readDatabase();
  const orderNumbers = db.orders.map(order => parseInt(order.orderNumber)).filter(num => !isNaN(num));
  return orderNumbers.length > 0 ? Math.max(...orderNumbers) + 1 : 1001;
};

module.exports = {
  readDatabase,
  writeDatabase,
  generateId,
  getNextOrderNumber
};