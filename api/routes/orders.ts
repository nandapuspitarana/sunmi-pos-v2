/**
 * Orders and payment validation API routes
 * Handle order creation, payment processing, and validation
 */
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const paymentDir = path.join(uploadDir, 'payments');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(paymentDir)) {
      fs.mkdirSync(paymentDir, { recursive: true });
    }
    
    cb(null, paymentDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and PDF are allowed'));
    }
  }
});

/**
 * Create New Order
 * POST /api/orders
 */
router.post('/', upload.single('payment_proof'), async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { visitor_id, items, total_amount } = req.body;

    // Validate required fields
    if (!visitor_id || !items || !total_amount) {
      res.status(400).json({
        success: false,
        error: 'Visitor ID, items, and total amount are required'
      });
      return;
    }

    // Parse items if it's a string
    let parsedItems;
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid items format'
      });
      return;
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Items must be a non-empty array'
      });
      return;
    }

    // Validate total amount
    const parsedTotalAmount = parseFloat(total_amount);
    if (isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Total amount must be a positive number'
      });
      return;
    }

    // Verify visitor exists
    const visitorResult = await client.query(
      'SELECT id FROM visitors WHERE id = $1',
      [visitor_id]
    );

    if (visitorResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Visitor not found'
      });
      return;
    }

    // Validate and check stock for all items
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of parsedItems) {
      const { product_id, quantity } = item;
      
      if (!product_id || !quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Each item must have valid product_id and quantity'
        });
        return;
      }

      // Get product details and check stock
      const productResult = await client.query(
        'SELECT id, name, price, stock, is_active FROM products WHERE id = $1',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: `Product with ID ${product_id} not found`
        });
        return;
      }

      const product = productResult.rows[0];

      if (!product.is_active) {
        res.status(400).json({
          success: false,
          error: `Product ${product.name} is not available`
        });
        return;
      }

      if (product.stock < quantity) {
        res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`
        });
        return;
      }

      validatedItems.push({
        product_id,
        quantity,
        unit_price: product.price,
        name: product.name
      });

      calculatedTotal += product.price * quantity;
    }

    // Verify calculated total matches provided total (allow small floating point differences)
    if (Math.abs(calculatedTotal - parsedTotalAmount) > 0.01) {
      res.status(400).json({
        success: false,
        error: `Total amount mismatch. Calculated: ${calculatedTotal}, Provided: ${parsedTotalAmount}`
      });
      return;
    }

    // Handle payment proof upload
    let paymentProofUrl = null;
    if (req.file) {
      paymentProofUrl = `/uploads/payments/${req.file.filename}`;
    }

    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (visitor_id, total_amount, payment_proof_url) VALUES ($1, $2, $3) RETURNING *',
      [visitor_id, parsedTotalAmount, paymentProofUrl]
    );

    const order = orderResult.rows[0];

    // Create order items and update stock
    for (const item of validatedItems) {
      // Insert order item
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.unit_price]
      );

      // Update product stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      order: {
        ...order,
        items: validatedItems
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

/**
 * Get All Orders
 * GET /api/orders
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, visitor_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        o.id,
        o.visitor_id,
        o.total_amount,
        o.payment_status,
        o.payment_proof_url,
        o.admin_notes,
        o.created_at,
        o.validated_at,
        v.qr_data as visitor_qr_data
      FROM orders o
      LEFT JOIN visitors v ON o.visitor_id = v.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`o.payment_status = $${params.length + 1}`);
      params.push(status);
    }

    if (visitor_id) {
      conditions.push(`o.visitor_id = $${params.length + 1}`);
      params.push(visitor_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await pool.query(`
          SELECT 
            oi.id,
            oi.product_id,
            oi.quantity,
            oi.unit_price,
            p.name as product_name,
            p.category as product_category
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1
        `, [order.id]);

        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders o';
    const countParams: any[] = [];
    const countConditions: string[] = [];

    if (status) {
      countConditions.push(`o.payment_status = $${countParams.length + 1}`);
      countParams.push(status);
    }

    if (visitor_id) {
      countConditions.push(`o.visitor_id = $${countParams.length + 1}`);
      countParams.push(visitor_id);
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      orders: ordersWithItems,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get Order by ID
 * GET /api/orders/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        o.id,
        o.visitor_id,
        o.total_amount,
        o.payment_status,
        o.payment_proof_url,
        o.admin_notes,
        o.created_at,
        o.validated_at,
        v.qr_data as visitor_qr_data,
        v.qr_code as visitor_qr_code
      FROM orders o
      LEFT JOIN visitors v ON o.visitor_id = v.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(`
      SELECT 
        oi.id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        p.name as product_name,
        p.category as product_category,
        p.image_url as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    res.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Validate Payment
 * PUT /api/orders/:id/validate
 */
router.put('/:id/validate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status must be either "approved" or "rejected"'
      });
      return;
    }

    // Check if order exists
    const orderResult = await pool.query(
      'SELECT id, payment_status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'Order payment has already been validated'
      });
      return;
    }

    // Update order status
    const updateResult = await pool.query(
      'UPDATE orders SET payment_status = $1, admin_notes = $2, validated_at = $3 WHERE id = $4 RETURNING *',
      [status, admin_notes || null, new Date(), id]
    );

    res.json({
      success: true,
      order: updateResult.rows[0],
      message: `Payment ${status} successfully`
    });
  } catch (error) {
    console.error('Validate payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Upload Payment Proof
 * POST /api/orders/:id/payment-proof
 */
router.post('/:id/payment-proof', upload.single('payment_proof'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Payment proof file is required'
      });
      return;
    }

    // Check if order exists
    const orderResult = await pool.query(
      'SELECT id, payment_proof_url FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    const order = orderResult.rows[0];
    const paymentProofUrl = `/uploads/payments/${req.file.filename}`;

    // Delete old payment proof if exists
    if (order.payment_proof_url) {
      const oldFilePath = path.join(process.env.UPLOAD_DIR || './uploads', order.payment_proof_url.replace('/uploads/', ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update order with new payment proof
    await pool.query(
      'UPDATE orders SET payment_proof_url = $1 WHERE id = $2',
      [paymentProofUrl, id]
    );

    res.json({
      success: true,
      file_path: req.file.path,
      file_url: paymentProofUrl,
      message: 'Payment proof uploaded successfully'
    });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get Order Statistics
 * GET /api/orders/stats/summary
 */
router.get('/stats/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_from, date_to } = req.query;

    let dateCondition = '';
    const params: any[] = [];

    if (date_from && date_to) {
      dateCondition = 'WHERE o.created_at >= $1 AND o.created_at <= $2';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateCondition = 'WHERE o.created_at >= $1';
      params.push(date_from);
    } else if (date_to) {
      dateCondition = 'WHERE o.created_at <= $1';
      params.push(date_to);
    }

    // Get order statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN payment_status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN payment_status = 'rejected' THEN 1 END) as rejected_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'approved' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN payment_status = 'approved' THEN total_amount END), 0) as average_order_value
      FROM orders o
      ${dateCondition}
    `, params);

    res.json({
      success: true,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;