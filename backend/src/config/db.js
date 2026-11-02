const mongoose = require('mongoose');

let memoryServer;

const startMemoryDatabase = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const conn = await mongoose.connect(memoryServer.getUri());
  console.log('MongoDB Connected: temporary demo database');
  return conn;
};

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (process.env.USE_MEMORY_DB === 'true') {
    console.warn('Using temporary in-memory MongoDB for demonstration only.');
    return startMemoryDatabase();
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

module.exports = connectDB;
