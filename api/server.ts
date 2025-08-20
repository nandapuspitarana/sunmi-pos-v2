/**
 * local server entry file, for local development
 */
import app, { server } from './app.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3000;

// Start the HTTP server with Socket.io
server.listen(PORT, () => {
  console.log(`🚀 Server ready on port ${PORT}`);
  console.log(`📡 Socket.io server running`);
  console.log(`📁 Static files served from /uploads`);
  console.log(`🔗 API endpoints available at ${process.env.API_BASE_URL || `http://localhost:${PORT}/api`}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;