import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[ProctorVision Server] Running on http://localhost:${PORT}`);
      console.log(`[ProctorVision Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = () => {
      console.log('\n[ProctorVision Server] Shutting down gracefully...');
      server.close(() => {
        console.log('[ProctorVision Server] Closed remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(`[Fatal Startup Error]: ${error.message}`);
    process.exit(1);
  }
};

startServer();
