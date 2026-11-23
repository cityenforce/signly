require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { seedInitialData } = require('./src/utils/seed');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('--- Starting Signly Backend Server ---');
    console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);

    // Step 1: Connect to MongoDB (strictly required before starting the HTTP server)
    console.log('Connecting to MongoDB...');
    await connectDB();

    // Step 2: Seed initial administrator and default client if required
    await seedInitialData();

    // Step 3: Start Express HTTP listener
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Signly production server listening on http://localhost:${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log(`Suburbs Registry: http://localhost:${PORT}/api/suburbs`);
      console.log(`Reports Endpoint: http://localhost:${PORT}/api/reports`);
      console.log(`Areas Endpoint: http://localhost:${PORT}/api/areas`);
      console.log(`Upload & R2: http://localhost:${PORT}/api/upload`);
      console.log(`Auth Endpoint: http://localhost:${PORT}/api/auth/login`);
    });

    // Graceful Shutdown handling
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('\n======================================================');
    console.error('FATAL: Failed to start Signly backend server.');
    console.error('Reason:', error.message);
    console.error('The Express server has NOT been started because a valid');
    console.error('MongoDB connection is required for persistent operations.');
    console.error('Please configure a valid MONGODB_URI in your .env file.');
    console.error('======================================================\n');
    process.exit(1);
  }
};

startServer();
