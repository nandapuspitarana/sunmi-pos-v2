/**
 * Product management API routes
 * Handle product CRUD operations
 */
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const productDir = path.join(uploadDir, 'products');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    
    cb(null, productDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Get All Products
 * GET /api/products
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, is_active, limit = 50, offset = 0, search } = req.query;

    let query = 'SELECT id, name, price, stock, category, image_url, is_active, created_at, updated_at FROM products';
    const params: any[] = [];
    const conditions: string[] = [];

    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(is_active === 'true');
    }

    if (search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR category ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM products';
    const countParams: any[] = [];
    const countConditions: string[] = [];

    if (category) {
      countConditions.push(`category = $${countParams.length + 1}`);
      countParams.push(category);
    }

    if (is_active !== undefined) {
      countConditions.push(`is_active = $${countParams.length + 1}`);
      countParams.push(is_active === 'true');
    }

    if (search) {
      countConditions.push(`(name ILIKE $${countParams.length + 1} OR category ILIKE $${countParams.length + 1})`);
      countParams.push(`%${search}%`);
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      products: result.rows,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get Product by ID
 * GET /api/products/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, name, price, stock, category, image_url, is_active, created_at, updated_at FROM products WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Create New Product
 * POST /api/products
 */
router.post('/', authenticateToken, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price, stock, category } = req.body;

    // Validate required fields
    if (!name || !price || !category) {
      res.status(400).json({
        success: false,
        error: 'Name, price, and category are required'
      });
      return;
    }

    // Validate price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({
        success: false,
        error: 'Price must be a valid positive number'
      });
      return;
    }

    // Validate stock
    const parsedStock = parseInt(stock) || 0;
    if (parsedStock < 0) {
      res.status(400).json({
        success: false,
        error: 'Stock must be a non-negative number'
      });
      return;
    }

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    // Insert new product
    const result = await pool.query(
      'INSERT INTO products (name, price, stock, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, parsedPrice, parsedStock, category, imageUrl]
    );

    res.status(201).json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update Product
 * PUT /api/products/:id
 */
router.put('/:id', authenticateToken, upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, price, stock, category, is_active } = req.body;

    // Check if product exists
    const existingProduct = await pool.query(
      'SELECT id, image_url FROM products WHERE id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    const currentProduct = existingProduct.rows[0];
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push(`name = $${params.length + 1}`);
      params.push(name);
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({
          success: false,
          error: 'Price must be a valid positive number'
        });
        return;
      }
      updates.push(`price = $${params.length + 1}`);
      params.push(parsedPrice);
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        res.status(400).json({
          success: false,
          error: 'Stock must be a non-negative number'
        });
        return;
      }
      updates.push(`stock = $${params.length + 1}`);
      params.push(parsedStock);
    }

    if (category !== undefined) {
      updates.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(is_active === 'true' || is_active === true);
    }

    // Handle image upload
    if (req.file) {
      const imageUrl = `/uploads/products/${req.file.filename}`;
      updates.push(`image_url = $${params.length + 1}`);
      params.push(imageUrl);

      // Delete old image file if exists
      if (currentProduct.image_url) {
        const oldImagePath = path.join(process.env.UPLOAD_DIR || './uploads', currentProduct.image_url.replace('/uploads/', ''));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
      return;
    }

    // Update product
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Delete Product
 * DELETE /api/products/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get product to delete image file
    const product = await pool.query(
      'SELECT image_url FROM products WHERE id = $1',
      [id]
    );

    if (product.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // Delete product
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    // Delete image file if exists
    const productData = product.rows[0];
    if (productData.image_url) {
      const imagePath = path.join(process.env.UPLOAD_DIR || './uploads', productData.image_url.replace('/uploads/', ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get Product Categories
 * GET /api/products/categories
 */
router.get('/meta/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products WHERE is_active = true ORDER BY category'
    );

    const categories = result.rows.map(row => row.category);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;