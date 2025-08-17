/**
 * QR Code management API routes
 * Handle QR code generation and verification
 */
import { Router, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * Generate QR Code for Visitor
 * POST /api/qrcode/generate
 */
router.post('/generate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 QR Code generation request received');
    console.log('📝 Request body:', req.body);
    
    const { visitor_name, booking_order_id, guest_count = 1, phone, email, company, purpose, permissions = ['gate_entry'] } = req.body;

    if (!visitor_name || !visitor_name.trim()) {
      console.log('❌ Validation failed: Visitor name is required');
      res.status(400).json({
        success: false,
        error: 'Visitor name is required'
      });
      return;
    }

    if (!booking_order_id || !booking_order_id.trim()) {
      console.log('❌ Validation failed: Booking order ID is required');
      res.status(400).json({
        success: false,
        error: 'Booking order ID is required'
      });
      return;
    }

    console.log('✅ Creating new visitor:', visitor_name.trim());
    console.log('🔐 Permissions:', permissions);

    // Generate unique QR code data first
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const qrCodeData = `VISITOR_${timestamp}_${randomId}`;
    console.log('🔄 Generated QR code data:', qrCodeData);
    
    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);
    console.log('✅ QR code image generated successfully');

    // Create metadata object with all visitor information
    const metadata = {
      visitor_name: visitor_name.trim(),
      booking_order_id: booking_order_id.trim(),
      guest_count: parseInt(guest_count) || 1,
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      company: company?.trim() || '',
      purpose: purpose?.trim() || ''
    };

    // Create new visitor with both qr_data and qr_code
    const insertResult = await pool.query(
      'INSERT INTO visitors (qr_data, qr_code, entry_time, status, is_active, permissions, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [qrCodeData, qrCodeImage, new Date(), 'registered', true, JSON.stringify(permissions), JSON.stringify(metadata)]
    );

    const visitor_id = insertResult.rows[0].id;
    console.log('✅ Visitor created with ID:', visitor_id);

    const response = {
      success: true,
      qr_code: qrCodeImage,
      qr_data: qrCodeData,
      visitor_id: visitor_id,
      message: 'QR code created successfully'
    };
    
    console.log('✅ QR Code generation completed successfully for visitor:', visitor_name);
    res.json(response);
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'Unknown error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Verify QR Code
 * GET /api/qrcode/verify/:qr_data
 */
router.get('/verify/:qr_data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { qr_data } = req.params;

    if (!qr_data) {
      res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
      return;
    }

    // Find visitor by QR data or QR code
    const result = await pool.query(
      'SELECT id, qr_data, qr_code, permissions, status, is_active FROM visitors WHERE qr_data = $1 OR qr_code = $1',
      [qr_data]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        valid: false,
        error: 'QR code not found'
      });
      return;
    }

    const visitor = result.rows[0];

    // Check if visitor is active
    if (!visitor.is_active) {
      res.status(403).json({
        success: false,
        valid: false,
        error: 'QR code is deactivated'
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      visitor_id: visitor.id,
      permissions: visitor.permissions,
      status: visitor.status
    });
  } catch (error) {
    console.error('QR code verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get All QR Codes
 * GET /api/qrcode/list
 */
router.get('/list', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    let query = `
      SELECT 
        v.id,
        v.qr_data,
        v.qr_code,
        v.permissions,
        v.status,
        v.is_active,
        v.entry_time,
        v.exit_time,
        v.created_at,
        v.metadata
      FROM visitors v
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE v.status = $1';
      params.push(status);
    }

    query += ' ORDER BY v.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
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
      qr_codes: result.rows,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update QR Code Status
 * PUT /api/qrcode/:visitor_id/status
 */
router.put('/:visitor_id/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { visitor_id } = req.params;
    const { is_active, permissions } = req.body;

    if (is_active === undefined) {
      res.status(400).json({
        success: false,
        error: 'is_active status is required'
      });
      return;
    }

    // Check if visitor exists
    const visitor = await pool.query(
      'SELECT id FROM visitors WHERE id = $1',
      [visitor_id]
    );

    if (visitor.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
      return;
    }

    // Update visitor status and permissions
    let query = 'UPDATE visitors SET is_active = $1';
    const params = [is_active];

    if (permissions) {
      query += ', permissions = $2';
      params.push(JSON.stringify(permissions));
    }

    query += ' WHERE id = $' + (params.length + 1);
    params.push(visitor_id);

    await pool.query(query, params);

    res.json({
      success: true,
      message: 'QR code status updated successfully'
    });
  } catch (error) {
    console.error('Update QR code status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Delete QR Code
 * DELETE /api/qrcode/:visitor_id
 */
router.delete('/:visitor_id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { visitor_id } = req.params;

    // Check if visitor exists
    const visitor = await pool.query(
      'SELECT id FROM visitors WHERE id = $1',
      [visitor_id]
    );

    if (visitor.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
      return;
    }

    // Delete visitor (this will cascade delete related records)
    await pool.query('DELETE FROM visitors WHERE id = $1', [visitor_id]);

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;