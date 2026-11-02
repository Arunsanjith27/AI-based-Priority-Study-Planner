const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error(`Backend startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
