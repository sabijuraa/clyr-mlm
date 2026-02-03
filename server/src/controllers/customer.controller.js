// server/src/controllers/customer.controller.js
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Customer login (FIXED!)
export const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const customer = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, customer.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: 'customer' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    delete customer.password_hash;
    res.json({ token, customer });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Customer registration
export const customerRegister = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, address_line1, address_line2, city, postal_code, country } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingCustomer = await pool.query('SELECT id FROM customers WHERE email = $1', [email.toLowerCase()]);
    if (existingCustomer.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO customers (first_name, last_name, email, password_hash, phone, address_line1, address_line2, city, postal_code, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, first_name, last_name, email, phone, address_line1, address_line2, city, postal_code, country, created_at
    `, [first_name, last_name, email.toLowerCase(), password_hash, phone, address_line1, address_line2, city, postal_code, country || 'Deutschland']);

    const customer = result.rows[0];
    const token = jwt.sign({ id: customer.id, email: customer.email, role: 'customer' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    res.status(201).json({ token, customer });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Get customer profile
export const getCustomerProfile = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, email, phone, address_line1, address_line2, city, postal_code, country, created_at
      FROM customers WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update customer profile (FIXED!)
export const updateCustomerProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, address_line1, address_line2, city, postal_code, country } = req.body;

    const result = await pool.query(`
      UPDATE customers
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          address_line1 = COALESCE($4, address_line1),
          address_line2 = $5,
          city = COALESCE($6, city),
          postal_code = COALESCE($7, postal_code),
          country = COALESCE($8, country),
          updated_at = NOW()
      WHERE id = $9
      RETURNING id, first_name, last_name, email, phone, address_line1, address_line2, city, postal_code, country
    `, [first_name, last_name, phone, address_line1, address_line2, city, postal_code, country, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get customer orders
export const getCustomerOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get customer invoices
export const getCustomerInvoices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM invoices WHERE customer_id = $1 ORDER BY invoice_date DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get customer invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};