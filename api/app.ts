/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import entryRoutes from './routes/entry.js';
import qrcodeRoutes from './routes/qrcode.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import type { Error } from './types/error';
// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config();

const app: express.Application = express();
const server = createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join admin room for monitoring
  socket.on('join-admin-room', (data) => {
    socket.join('admin-room');
    console.log(`Admin ${data.admin_id} joined monitoring room`);
  });

  // Join visitor room for notifications
  socket.on('join-visitor-room', (data) => {
    socket.join(`visitor-${data.visitor_id}`);
    console.log(`Visitor ${data.visitor_id} joined room`);
  });

  // Request real-time stats
  socket.on('request-stats', async () => {
    try {
      // Import pool here to avoid circular dependency
      const { default: pool } = await import('./config/database.js');
      
      // Get visitor stats
      const visitorStats = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_visitors,
          COUNT(CASE WHEN status = 'entered' THEN 1 END) as active_visitors,
          COUNT(CASE WHEN status = 'exited' THEN 1 END) as exited_visitors,
          COUNT(*) as total_visitors
        FROM visitors
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      
      // Get pending payments (mock data for now)
      const pendingPayments = 3;
      
      // Get daily revenue (mock data for now)
      const dailyRevenue = 2500000;
      
      const stats = {
        registered_visitors: parseInt(visitorStats.rows[0].registered_visitors) || 0,
        active_visitors: parseInt(visitorStats.rows[0].active_visitors) || 0,
        exited_visitors: parseInt(visitorStats.rows[0].exited_visitors) || 0,
        total_visitors: parseInt(visitorStats.rows[0].total_visitors) || 0,
        pending_payments: pendingPayments,
        daily_revenue: dailyRevenue,
        gate_status: 'online'
      };
      
      socket.emit('stats-update', stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback stats
      const stats = {
        registered_visitors: 0,
        active_visitors: 0,
        exited_visitors: 0,
        total_visitors: 0,
        pending_payments: 0,
        daily_revenue: 0,
        gate_status: 'offline'
      };
      socket.emit('stats-update', stats);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
const uploadsPath = path.join(process.cwd(), process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadsPath));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/entry', entryRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

// Export both app and server
export default app;
export { server };