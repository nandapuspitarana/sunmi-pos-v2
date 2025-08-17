/**
 * Entry tracking API routes
 * Handle visitor entry scanning and QR code management
 */
import { Router, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * Scan QR Code for Entry/Exit
 * POST /api/entry/scan
 */
router.post('/scan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { qr_data, action, gate_location = 'Main Gate', scanned_by = 'Admin' } = req.body;

    if (!qr_data) {
      res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
      return;
    }

    if (!action || !['entry', 'exit'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Action must be either "entry" or "exit"'
      });
      return;
    }

    // Find visitor by QR data
    const visitorResult = await pool.query(
      'SELECT id, status, metadata FROM visitors WHERE qr_data = $1',
      [qr_data]
    );

    if (visitorResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'QR code not found. Please register first.'
      });
      return;
    }

    const visitor = visitorResult.rows[0];
    const currentTime = new Date();
    let newStatus = visitor.status;
    let updateQuery = '';
    let updateParams: any[] = [];
    let message = '';

    if (action === 'entry') {
      if (visitor.status === 'registered') {
        newStatus = 'entered';
        updateQuery = 'UPDATE visitors SET status = $1, entry_time = $2 WHERE id = $3';
        updateParams = [newStatus, currentTime, visitor.id];
        message = `Welcome! Visitor has entered successfully.`;
      } else if (visitor.status === 'entered') {
        res.status(400).json({
          success: false,
          error: 'Visitor is already inside'
        });
        return;
      } else if (visitor.status === 'exited') {
        newStatus = 'entered';
        updateQuery = 'UPDATE visitors SET status = $1, entry_time = $2, exit_time = NULL WHERE id = $3';
        updateParams = [newStatus, currentTime, visitor.id];
        message = `Welcome back! Visitor has re-entered.`;
      }
    } else if (action === 'exit') {
      if (visitor.status === 'entered') {
        newStatus = 'exited';
        updateQuery = 'UPDATE visitors SET status = $1, exit_time = $2 WHERE id = $3';
        updateParams = [newStatus, currentTime, visitor.id];
        message = `Goodbye! Visitor has exited successfully.`;
      } else if (visitor.status === 'registered') {
        res.status(400).json({
          success: false,
          error: 'Visitor has not entered yet'
        });
        return;
      } else if (visitor.status === 'exited') {
        res.status(400).json({
          success: false,
          error: 'Visitor has already exited'
        });
        return;
      }
    }

    // Update visitor status
    await pool.query(updateQuery, updateParams);

    // Log the movement
    await pool.query(
      'INSERT INTO visitor_movements (visitor_id, action, timestamp, gate_location, scanned_by) VALUES ($1, $2, $3, $4, $5)',
      [visitor.id, action, currentTime, gate_location, scanned_by]
    );

    // Get visitor name from metadata
    const visitorName = visitor.metadata?.visitor_name || 'Unknown Visitor';

    // Emit real-time update to admin dashboard
    const io = req.app.get('io');
    if (io) {
      const movementData = {
        visitor_id: visitor.id,
        visitor_name: visitorName,
        booking_order_id: visitor.metadata?.booking_order_id,
        action: action,
        status: newStatus,
        timestamp: currentTime.toISOString(),
        gate_location: gate_location,
        scanned_by: scanned_by
      };
      
      // Broadcast to admin room
      io.to('admin-room').emit('visitor-movement', movementData);
      
      // Send notification to specific visitor room
      io.to(`visitor-${visitor.id}`).emit('status-update', {
        status: newStatus,
        message: message,
        timestamp: currentTime.toISOString()
      });
    }

    res.json({
      success: true,
      visitor_id: visitor.id,
      visitor_name: visitorName,
      action: action,
      status: newStatus,
      timestamp: currentTime.toISOString(),
      message: message
    });
  } catch (error) {
    console.error('Entry/Exit scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get All Visitors
 * GET /api/entry/visitors
 */
router.get('/visitors', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, qr_data, qr_code, entry_time, exit_time, status, created_at FROM visitors';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY entry_time DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM visitors';
    const countParams: any[] = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      visitors: result.rows,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get Visitor Movements History
 * GET /api/entry/movements
 */
router.get('/movements', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0, visitor_id } = req.query;

    let query = `
      SELECT 
        vm.id,
        vm.visitor_id,
        vm.action,
        vm.timestamp,
        vm.gate_location,
        vm.scanned_by,
        v.metadata
      FROM visitor_movements vm
      LEFT JOIN visitors v ON vm.visitor_id = v.id
    `;
    const params: any[] = [];

    if (visitor_id) {
      query += ' WHERE vm.visitor_id = $1';
      params.push(visitor_id);
    }

    query += ' ORDER BY vm.timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM visitor_movements';
    const countParams: any[] = [];
    if (visitor_id) {
      countQuery += ' WHERE visitor_id = $1';
      countParams.push(visitor_id);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      movements: result.rows,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;