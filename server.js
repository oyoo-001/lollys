import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import cors from 'cors';
import { randomUUID, randomBytes, createHash } from 'crypto';
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";

import Stripe from 'stripe';
const { CloudinaryStorage } = pkg;
import nodemailer from 'nodemailer';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL_RAW = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const APP_URL = FRONTEND_URL_RAW.startsWith('http') 
    ? FRONTEND_URL_RAW 
    : `https://${FRONTEND_URL_RAW}`;

 app.use(cors({ origin: APP_URL, credentials: true }));
 app.use(express.json()); // for parsing application/json

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// --- DATABASE CONNECTION ---
let db;

try {
  db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Cloud DBs often use non-standard ports
    ssl: {
      rejectUnauthorized: false // REQUIRED for most Cloud MySQL (Aiven, AWS, etc.)
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Test the connection immediately
  await db.getConnection();
  console.log('✅ Connected to the Cloud Database successfully.');
} catch (err) {
  console.error('❌ Database connection failed:', err.message);
  // Optional: Don't exit if you want the server to try and recover
  // process.exit(1); 
}

export default db;



// --- NODEMAILER (EMAIL) SETUP ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT), 
  secure: parseInt(process.env.SMTP_PORT) === 465, // Use SSL for 465
  family: 4,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
 
  tls: {
    rejectUnauthorized: false // Helps prevent connection drops on some cloud hosts
  }
});
async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

function createBrandedEmail(title, content) {
    const brandName = "Lolly's Collection";
    const footerDetails = `
        <p>If you have any questions, you can reply to this email or contact our support team through our website.</p>
        <p style="margin-top: 10px;">${brandName} | Nairobi, Kenya</p>
        <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
    `;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #334155; line-height: 1.6;">
        <div style="background-color: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${brandName}</h1>
        </div>
        <div style="padding: 25px 20px;">
          <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">${title}</h2>
          ${content}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          ${footerDetails}
        </div>
      </div>
    `;
}

async function sendOrderConfirmationEmail(orderId) {
  try {
    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      console.error(`Attempted to send confirmation for non-existent order ID: ${orderId}`);
      return;
    }

    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = order.total_amount - subtotal;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center;">
          <img src="${item.image_url}" alt="${item.product_name}" width="60" style="border-radius: 8px; margin-right: 15px;">
          <div>
            <strong>${item.product_name}</strong><br>
            <span style="font-size: 0.9em; color: #666;">Quantity: ${item.quantity}</span>
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: middle;">KES ${Number(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const contentHtml = `
      <p>Hi ${order.customer_name},</p>
      <p>We've received your order #${order.id} and are getting it ready for shipment. We'll notify you again once it's on its way.</p>
      
      <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 8px 0; text-align: right; color: #666;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; width: 100px;">KES ${Number(subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; text-align: right; color: #666;">Shipping</td>
            <td style="padding: 8px 0; text-align: right;">KES ${Number(shippingCost).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px;">Total</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px;">KES ${Number(order.total_amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Shipping Information</h3>
      <p style="line-height: 1.6;">
        ${order.customer_name}<br>
        ${order.shipping_address}<br>
        ${order.phone}
      </p>
    `;

    const emailHtml = createBrandedEmail('Thank You For Your Order!', contentHtml);

    await sendEmail({
      to: order.customer_email,
      subject: `Your Lolly's Collection Order Confirmation #${order.id}`,
      html: emailHtml,
    });
    console.log(`✅ Order confirmation email sent for order ID: ${orderId}`);
  } catch (error) {
    console.error(`❌ Failed to send order confirmation email for order ID: ${orderId}`, error);
  }
}





// --- CLOUDINARY SETUP ---
// File upload middleware
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'lollys_uploads',
      resource_type: 'auto', // Automatically detect image/video/raw
      public_id: `${req.user ? req.user.id : 'anon'}-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`,
    };
  },
});
const upload = multer({ storage: storage });

// --- WEBSOCKETS FOR LIVE SUPPORT ---
const server = http.createServer(app); // Create HTTP server from Express app
const wss = new WebSocketServer({ server });
const clients = new Map(); // Store connected clients: userId -> { ws, role, name }

// Generic broadcast function to send messages to all connected clients
const broadcast = (message) => {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
};


// --- MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  // Assumes authMiddleware has run and set req.user
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};



// --- DATABASE PERSISTENCE FOR CHAT ---

const saveMessage = async (message) => {
  const { conversation_id, sender_id, receiver_id, message_text, is_from_admin, attachment_url } = message;
  const [result] = await db.query(
    'INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_text, is_from_admin, attachment_url) VALUES (?, ?, ?, ?, ?, ?)',
    [conversation_id, sender_id, receiver_id, message_text, is_from_admin, attachment_url || null]
  );
  const [[savedMessage]] = await db.query('SELECT * FROM chat_messages WHERE id = ?', [result.insertId]);
  return savedMessage;
};



// --- CHAT HISTORY ENDPOINTS ---
app.get('/api/chat/my-history', authMiddleware, async (req, res, next) => {
  try {
    const [messages] = await db.query(
      'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_date ASC',
      [req.user.id]
    );
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.get('/api/chat/history/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;
    // Mark messages as read when admin fetches them
    await db.query('UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND is_from_admin = FALSE', [userId]);
    const [messages] = await db.query('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_date ASC', [userId]);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.get('/api/chat/conversations', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // Join with chat_conversations to get status. Default to 'active' if no record exists.
    // This query gets users who have either sent a message or have a conversation record.
    const [conversations] = await db.query(`SELECT 
        u.id, 
        u.full_name as name, 
        MAX(cm.created_date) as last_message_date, 
        SUM(CASE WHEN cm.is_read = 0 AND cm.is_from_admin = 0 THEN 1 ELSE 0 END) as unread_count,
        COALESCE(cc.status, 'active') as status,
        cc.status as db_status
    FROM users u 
    LEFT JOIN chat_messages cm ON u.id = cm.conversation_id
    LEFT JOIN chat_conversations cc ON u.id = cc.user_id
    WHERE u.role = 'user' 
    GROUP BY u.id, u.full_name, cc.status
    HAVING last_message_date IS NOT NULL OR db_status IS NOT NULL
    ORDER BY 
        (status = 'pending') DESC,
        FIELD(status, 'active', 'resolved', 'archived'), 
        unread_count DESC, 
        last_message_date DESC
`);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

app.put('/api/chat/conversations/:userId/status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    await db.query(`
      INSERT INTO chat_conversations (user_id, status) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE status = ?
    `, [userId, status, status]);
    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
});

wss.on('connection', (ws, req) => {
  // Use the host header from the request to create a valid base URL
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  const host = req.headers.host;
  const fullUrl = `${protocol}://${host}${req.url}`;
  
  const parsedUrl = new URL(fullUrl);
  const token = parsedUrl.searchParams.get('token');

  if (!token) {
    console.error("Connection rejected: No token provided");
    ws.close(1008, "Token required");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('WS Auth Error:', error.message);
    ws.close(1008, 'Invalid token');
    return; // Ensure we exit the function entirely
  }
const { id: userId, role, fullName, email } = decoded;
  // 2. Handle Duplicate Connections
  if (clients.has(userId)) {
    console.log(`Closing existing connection for user: ${userId}`);
    clients.get(userId).ws.close();
  }

  clients.set(userId, { ws, role, name: fullName || email });
  console.log(`✅ WebSocket client connected: ${userId} (role: ${role})`);

  // 4. MUST HAVE: Cleanup on Disconnect
 ws.on('close', () => {
    if (clients.get(userId)?.ws === ws) {
      clients.delete(userId);
      console.log(`❌ WebSocket client disconnected: ${userId}`);
    }
  });

  // Handle errors to prevent server crashes
  ws.on('error', (err) => {
    console.error(`WS Error for ${userId}:`, err);
    clients.delete(userId);
  });
  // Helper to get list of online admins
  const getOnlineAdmins = () => {
    const adminList = [];
    clients.forEach((client, id) => {
      if (client.role === 'admin') {
        adminList.push({ id, name: client.name });
      }
    });
    return adminList;
  };

  // Helper to broadcast to admins
  const broadcastToAdmins = (message) => {
    clients.forEach((client) => {
      if (client.role === 'admin' && client.ws?.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  };

  // 3. Announce connection
  if (role === 'admin') {
    // Notify this admin of their connection status and who else is online
    ws.send(JSON.stringify({ type: 'server:connected' }));
    ws.send(JSON.stringify({ type: 'server:admins_online', payload: getOnlineAdmins() }));
    // Notify all OTHER admins that a new admin has come online
    clients.forEach((client, id) => {
      if (client.role === 'admin' && id !== userId && client.ws?.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'server:admin_online', payload: { id: userId, name: fullName || email } }));
      }
    });
  } else {
    // User connected, notify all admins of their presence
    broadcastToAdmins({ type: 'server:user_online', payload: { id: userId, name: fullName || email } });
  }

  // 4. Handle messages
  ws.on('message', async (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage);
      console.log(`Received message from ${userId}:`, message);

      const { type, payload } = message;

      if (type === 'message:to_user' && role === 'admin') { // Admin to User
        // Admin sends a message to a specific user
        const { to, text, attachment } = payload;
        const dbMessage = await saveMessage({
          conversation_id: to,
          sender_id: userId,
          receiver_id: to,
          message_text: text,
          attachment_url: attachment,
          is_from_admin: true,
        });

        const recipient = clients.get(to);
        if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
          const senderName = clients.get(userId)?.name || 'Support Agent';
          recipient.ws.send(JSON.stringify({ type: 'message:from_admin', payload: { ...dbMessage, admin_name: senderName } }));
        } else {
          // User is offline, send an email notification
          const [[offlineUser]] = await db.query('SELECT * FROM users WHERE id = ?', [to]);
          if (offlineUser) {
            await sendEmail({
              to: offlineUser.email,
              subject: `New message from Lolly's Collection Support`,
              html: `
                <p>Hi ${offlineUser.full_name || 'there'},</p>
                <p>You have a new message from our support team:</p>
                <blockquote style="border-left: 2px solid #eee; padding-left: 1em; margin: 1em 0;">${text}</blockquote>
                ${attachment ? `<p>An attachment was also sent. Please log in to view it.</p>` : ''}
                <p>Click the button below to view the conversation and reply.</p>
                <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #d97706; border-radius: 5px; text-decoration: none;">View Conversation</a>
                <p>Best regards,<br/>Lolly's Collection Team</p>
              `
            });
          }
        }
      } else if (type === 'message:to_admin' && role !== 'admin') { // User to Admin
        // User sends a message to all connected admins
        const { text, attachment } = payload;
        const dbMessage = await saveMessage({
          conversation_id: userId,
          sender_id: userId,
          receiver_id: 'admin', // Generic admin receiver
          message_text: text,
          attachment_url: attachment,
          is_from_admin: false,
        });

        // Auto-reopen conversation if user sends a message
        await db.query(`
          INSERT INTO chat_conversations (user_id, status) VALUES (?, 'active')
          ON DUPLICATE KEY UPDATE status = 'active'
        `, [userId]);

        broadcastToAdmins({ type: 'message:from_user', payload: dbMessage });
      } else if (type === 'chat:initiate' && role !== 'admin') {
        // User has opened the chat widget and wants to talk.
        // Set status to 'pending' to signal an incoming request.
        await db.query(`
          INSERT INTO chat_conversations (user_id, status) VALUES (?, 'pending')
          ON DUPLICATE KEY UPDATE status = 'pending'
        `, [userId]);

        // Notify admins that a user is requesting a chat.
        // This will trigger a notification and a refetch on the admin client.
        broadcastToAdmins({ type: 'chat:requested', payload: { id: userId, name: fullName || email } });
      }
      else if (type === 'typing:start') {
        if (role === 'admin') {
          // Admin is typing to a user
          const { to } = payload;
          const recipient = clients.get(to);
          if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
            recipient.ws.send(JSON.stringify({ type: 'typing:start:admin' }));
          }
        } else {
          // User is typing to admins
          broadcastToAdmins({ type: 'typing:start:user', payload: { userId } });
        }
      } else if (type === 'typing:stop') {
        if (role === 'admin') {
          // Admin stopped typing to a user
          const { to } = payload;
          const recipient = clients.get(to);
          if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
            recipient.ws.send(JSON.stringify({ type: 'typing:stop:admin' }));
          }
        } else {
          // User stopped typing to admins
          broadcastToAdmins({ type: 'typing:stop:user', payload: { userId } });
        }
      }
    } catch (e) {
      console.error('Failed to process message', e);
    }
  });
});

// --- AUTHENTICATION (PASSPORT & JWT) ---
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${APP_URL}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
      let user = rows[0];
      if (!user) {
        // Create new user
        const newUserId = randomUUID();
        // Google users are automatically verified
        await db.query('INSERT INTO users (id, google_id, full_name, email, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
          [newUserId, profile.id, profile.displayName, profile.emails[0].value, 'user', true]);
        const [newRows] = await db.query('SELECT * FROM users WHERE id = ?', [newUserId]);
        user = newRows[0];
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

const createToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, fullName: user.full_name, avatar_url: user.avatar_url }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// --- API: AUTH ROUTES ---
app.post('/api/auth/register', async (req, res, next) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) return res.status(400).json({ message: 'All fields are required' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = randomUUID();

    await db.query(
      'INSERT INTO users (id, full_name, email, password, is_verified) VALUES (?, ?, ?, ?, ?)',
      [newUserId, fullName, email, hashedPassword, true]
    );

    res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !user.password) return res.status(401).json({ message: 'Invalid credentials or use Google Sign-In' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = createToken(user);
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth' }), (req, res) => {
  const token = createToken(req.user);
  // Redirect to a page that saves the token and then redirects to home
  res.redirect(`${APP_URL}/auth/callback?token=${token}`);
});

app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user) return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    const resetToken = randomBytes(32).toString('hex');
    const hashedResetToken = createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [hashedResetToken, resetTokenExpires, user.id]);

    const resetUrl = `${APP_URL}/reset-password/${resetToken}`;

    const emailHtml = createBrandedEmail('Password Reset Request', `
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Your Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">If you did not request this, please ignore this email.</p>
    `);

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: emailHtml
    });

    res.json({ message: 'If a user with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const [users] = await db.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [hashedToken]);
    const user = users[0];

    if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, user.id]);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
});


app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
const [rows] = await db.query('SELECT id, full_name, email, role, created_date, phone, avatar_url FROM users WHERE id = ?', [req.user.id]);    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/api/auth/me', authMiddleware, async (req, res, next) => {
     
    try {
        const { id } = req.user;
        
        const { full_name, phone, avatar_url } = req.body;

        const fieldsToUpdate = {};
        if (full_name !== undefined) fieldsToUpdate.full_name = full_name;
        if (phone !== undefined) fieldsToUpdate.phone = phone;
        if (avatar_url !== undefined) fieldsToUpdate.avatar_url = avatar_url;

        if (Object.keys(fieldsToUpdate).length > 0) {
            await db.query('UPDATE users SET ? WHERE id = ?', [fieldsToUpdate, id]);
        }

        const [updatedUser] = await db.query('SELECT id, full_name, email, role, created_date, phone, avatar_url FROM users WHERE id = ?', [id]);
        res.json(updatedUser[0]);
    } catch (error) {
        next(error);
    }
});
app.post('/api/auth/change-password', authMiddleware, async (req, res, next) => {
    try {
        const { id } = req.user;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'All fields are required' });
        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [id]);
        const user = rows[0];
        if (!user || !user.password) return res.status(401).json({ message: 'User not found or password not set.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect current password.' });
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, id]);
        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        next(error);
    }
});

// --- API: UPLOAD ROUTE ---
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  res.status(201).json({ file_url: req.file.path });
});

// --- API: PRODUCTS ---
app.get('/api/products', async (req, res, next) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY created_date DESC');
    res.json(products);
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', authMiddleware, async (req, res, next) => {
  try {
    const { name, description, price, category, image_url, stock, featured, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO products (name, description, price, category, image_url, stock, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, category, image_url, stock, featured, status]
    );
    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(newProduct[0]);

    // Notify all clients that products have been updated
    broadcast({ type: 'products:updated' });
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock, featured, status } = req.body;
    await db.query(
      'UPDATE products SET name=?, description=?, price=?, category=?, image_url=?, stock=?, featured=?, status=? WHERE id = ?',
      [name, description, price, category, image_url, stock, featured, status, id]
    );
    const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updatedProduct[0]);

    // Notify all clients that products have been updated
    broadcast({ type: 'products:updated' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM products WHERE id = ?', [id]);

    // Notify all clients that products have been updated
    broadcast({ type: 'products:updated' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
import { readFile } from 'fs/promises';

// --- API: SHIPPING FEES (from local JSON file) ---
app.get('/api/shipping-fees', async (req, res) => {
    try {
        const data = await readFile(path.join(__dirname, 'shipment-fee.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: "Failed to load shipping data" });
    }
});
// --- API: ORDERS ---
app.get('/api/orders', authMiddleware, async (req, res, next) => {
    try {
        let query = 'SELECT * FROM orders';
        const params = [];
        if (req.user.role !== 'admin') {
            query += ' WHERE customer_email = ?';
            params.push(req.user.email);
        }
        query += ' ORDER BY created_date DESC';
        
        const [allOrders] = await db.query(query, params);
        if (allOrders.length === 0) {
            return res.json([]);
        }

        const orderIds = allOrders.map(o => o.id);
        const [items] = await db.query('SELECT * FROM order_items WHERE order_id IN (?)', [orderIds]);
        
        const ordersWithItems = allOrders.map(order => ({
            ...order,
            items: items.filter(item => item.order_id === order.id)
        }));

        res.json(ordersWithItems);
    } catch (error) {
        next(error);
    }
});

app.put('/api/orders/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Basic validation
        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }

        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Order status updated.' });
    } catch (error) {
        next(error);
    }
});

app.post('/api/orders', authMiddleware, async (req, res, next) => {
    const { 
  customer_email, 
  customer_name, 
  items, 
  county,        // Received from frontend dropdown
  address,       // Received from frontend input
  payment_method, 
  phone, 
  notes 
} = req.body;
    if (!customer_email || !items || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // --- BACKEND CALCULATION (SECURITY CHECK) ---
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Load shipping fees
        const feesData = JSON.parse(await readFile(path.join(__dirname, 'shipment-fee.json'), 'utf8'));
        
        // Calculate shipping: Free if > 50,000 OR if county fee is 0
        const shippingFee = subtotal >= 50000 ? 0 : (feesData[county] ?? feesData["Default"]);
        const total_amount = subtotal + shippingFee;

        const reference = uuidv4();
        const full_shipping_address = `${address}, ${county}`;

        const [orderResult] = await connection.query(
    `INSERT INTO orders (
        customer_id, 
        customer_email, 
        customer_name, 
        total_amount, 
        payment_method, 
        shipping_address, -- Keep this for a full string if needed
        county,           -- NEW: Specific column
        street_address,   -- NEW: Specific column
        phone, 
        notes, 
        status, 
        payment_status, 
        reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        req.user.id, 
        customer_email, 
        customer_name, 
        total_amount, 
        payment_method, 
       full_shipping_address, 
        county,                  
        address,                 
        phone, 
        notes, 
        'pending', 
        'unpaid', 
        reference
    ]
);
        const orderId = orderResult.insertId;

        const orderItems = items.map(item => [orderId, item.product_id, item.product_name, item.quantity, item.price, item.image_url]);
        await connection.query(
            'INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image_url) VALUES ?',
            [orderItems]
        );

        // --- PAYMENT GATEWAY REDIRECT ---
        // Paystack Initialization (M-Pesa/Card)
        const amountInCents = Math.round(total_amount * 100); 

        const paystackResponse = await axios.post(
            `${PAYSTACK_API_URL}/transaction/initialize`,
            {
                email: customer_email,
                amount: amountInCents,
                reference: reference,
                callback_url: `${APP_URL}/payment/callback`,
                metadata: { order_id: orderId, county: county },
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        await connection.commit();
        res.status(200).json({ authorization_url: paystackResponse.data.data.authorization_url });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});
app.post('/api/orders/initialize', authMiddleware, async (req, res, next) => {
    const { customer_email, customer_name, items, county, address, phone, notes, payment_method } = req.body;

    if (!customer_email || !items || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // 1. Calculate totals securely
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const feesData = JSON.parse(await readFile(path.join(__dirname, 'shipment-fee.json'), 'utf8'));
        const shippingFee = subtotal >= 50000 ? 0 : (feesData[county] ?? feesData["Default"]);
        const total_amount = subtotal + shippingFee;
        
        const reference = uuidv4();
        const paystackPayload = {
            email: customer_email,
            amount: Math.round(total_amount * 100),
            reference: reference,
            callback_url: `${APP_URL}/payment/callback`,
                metadata: {
                    user_id: req.user.id,
                    customer_name,
                    phone,
                    county,
                    address,
                    notes,
                    items: JSON.stringify(items) // Important: Stringify the array
                },
        };

        if (payment_method === 'mpesa') {
            paystackPayload.channels = ['mobile_money'];
        } else if (payment_method === 'card') {
            paystackPayload.channels = ['card'];
        }

        // 2. Initialize Paystack with ALL order data in metadata
        const paystackResponse = await axios.post(
            `${PAYSTACK_API_URL}/transaction/initialize`,
            paystackPayload,
            { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
        );

        res.status(200).json({ authorization_url: paystackResponse.data.data.authorization_url });
    } catch (error) {
        next(error);
    }
});
app.get('/api/payment/verify', authMiddleware, async (req, res, next) => {
    const { reference } = req.query;
    const connection = await db.getConnection();

    try {
        const verifyRes = await axios.get(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });

        const { status, data } = verifyRes.data;

        if (status && data.status === 'success') {
            const meta = data.metadata;

            // Check if already logged (prevent duplicates from Webhook)
            const [existing] = await connection.query('SELECT id, payment_status FROM orders WHERE reference = ?', [reference]);
            
            if (existing.length > 0) {
                // Fix: Update status if order exists but is not marked as paid
                if (existing[0].payment_status !== 'paid') {
                    await connection.query("UPDATE orders SET status = 'processing', payment_status = 'paid' WHERE id = ?", [existing[0].id]);
                }
                return res.status(200).json({ status: 'success', orderId: existing[0].id });
            }

            // Fix: Move JSON.parse here to prevent crash if meta.items is missing (e.g. Flow 1)
            const items = meta.items ? JSON.parse(meta.items) : [];

            await connection.beginTransaction();

            const paymentMethod = data.channel === 'mobile_money' ? 'mpesa' : data.channel;

            // INSERT ORDER (Fix: status set to 'processing' to match Schema ENUM)
            const [orderResult] = await connection.query(
                `INSERT INTO orders 
                (customer_id, customer_email, customer_name, total_amount, payment_method, shipping_address, county, street_address, phone, notes, status, payment_status, reference) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', 'paid', ?)`,
                [
                    meta.user_id, 
                    data.customer.email, 
                    meta.customer_name, 
                    (data.amount / 100),
                    paymentMethod, 
                    `${meta.address}, ${meta.county}`, 
                    meta.county, 
                    meta.address, 
                    meta.phone, 
                    meta.notes, 
                    reference
                ]
            );

            const orderId = orderResult.insertId;

            // INSERT ITEMS
            const orderItems = items.map(item => [
                orderId, 
                item.product_id, 
                item.product_name, 
                item.quantity, 
                item.price, 
                item.image_url
            ]);

            await connection.query(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image_url) VALUES ?',
                [orderItems]
            );

            await connection.commit();
            
            // Response sent directly after successful DB commit
            res.status(200).json({ status: 'success', orderId });
        } else {
            res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});
app.post('/api/paystack-webhook', async (req, res) => {
    // 1. Verify the event is actually from Paystack (Security)
    const crypto = await import('crypto');
    const hash = crypto.createHmac('sha256', process.env.PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Invalid signature');
    }

    const event = req.body;

    // 2. Handle successful payment
    if (event.event === 'charge.success') {
        const data = event.data;
        const reference = data.reference;

        // Check if order already exists (to avoid duplicates from the verify endpoint)
        const [existing] = await db.query('SELECT id, payment_status FROM orders WHERE reference = ?', [reference]);
        
        if (existing.length === 0) {
            const meta = data.metadata;
            const items = JSON.parse(meta.items);
            const connection = await db.getConnection();
            const paymentMethod = data.channel === 'mobile_money' ? 'mpesa' : data.channel;
            const fullShippingAddress = `${meta.address}, ${meta.county}`;

            try {
                await connection.beginTransaction();

                // Create the order as 'processing'
                const [orderResult] = await connection.query(
                    `INSERT INTO orders
                    (customer_id, customer_email, customer_name, total_amount, payment_method, shipping_address, county, street_address, phone, notes, status, payment_status, reference)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', 'paid', ?)`,
                    [
                        meta.user_id, data.customer.email, meta.customer_name, (data.amount / 100),
                        paymentMethod, fullShippingAddress, meta.county, meta.address,
                        meta.phone, meta.notes, reference
                    ]
                );

                const orderId = orderResult.insertId;

                const orderItems = items.map(item => [orderId, item.product_id, item.product_name, item.quantity, item.price, item.image_url]);
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image_url) VALUES ?',
                    [orderItems]
                );

                await connection.commit();
                // Send confirmation email
                await sendOrderConfirmationEmail(orderId);
                console.log(`✅ Order ${orderId} created via Webhook.`);
            } catch (error) {
                await connection.rollback();
                console.error('Webhook DB Error:', error);
            } finally {
                connection.release();
            }
        } else {
            // Fix: If order exists but is pending/unpaid, update it and send email
            const order = existing[0];
            if (order.payment_status !== 'paid') {
                await db.query("UPDATE orders SET status = 'processing', payment_status = 'paid' WHERE id = ?", [order.id]);
                await sendOrderConfirmationEmail(order.id);
                console.log(`✅ Existing Order ${order.id} updated to processing via Webhook.`);
            }
        }
    }

    res.status(200).send('OK');
});

// --- API: USERS ---
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const [users] = await db.query('SELECT id, full_name, email, role, phone, created_date FROM users ORDER BY created_date DESC');
        res.json(users);
    } catch (error) {
        next(error);
    }
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const [targetUserRows] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        if (targetUserRows[0]?.role === 'admin') {
            return res.status(403).json({ message: "Cannot change another admin's role." });
        }
        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        const [updatedUser] = await db.query('SELECT id, full_name, email, role, created_date FROM users WHERE id = ?', [id]);
        res.json(updatedUser[0]);
    } catch (error) {
        next(error);
    }
});

// --- API: SUPPORT TICKETS ---
app.get('/api/support-tickets', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const [tickets] = await db.query('SELECT * FROM support_tickets ORDER BY created_date DESC');
        res.json(tickets);
    } catch (error) {
        next(error);
    }
});

app.post('/api/support-tickets', async (req, res, next) => {
    try {
        const { customer_email, customer_name, subject, message, priority } = req.body;
        const [result] = await db.query(
            'INSERT INTO support_tickets (customer_email, customer_name, subject, message, priority) VALUES (?, ?, ?, ?, ?)',
            [customer_email, customer_name, subject, message, priority]
        );
        const [newTicket] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [result.insertId]);
        res.status(201).json(newTicket[0]);
    } catch (error) {
        next(error);
    }
});

app.put('/api/support-tickets/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, admin_response } = req.body;
        
        await db.query('UPDATE support_tickets SET status = ?, admin_response = ? WHERE id = ?', [status, admin_response || null, id]);

        if (admin_response) {
            const [ticketRows] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
            const ticket = ticketRows[0];
            const emailHtml = createBrandedEmail(`Re: ${ticket.subject}`, `
                <p>Hi ${ticket.customer_name || ''},</p>
                <p>This is a response to your support ticket regarding "${ticket.subject}":</p>
                <blockquote style="border-left: 2px solid #eee; padding-left: 1em; margin: 1em 0; font-style: italic; color: #334155;">${admin_response}</blockquote>
                <p>If you have further questions, please reply to this email or open a new ticket on our website.</p>
            `);
            await sendEmail({
                to: ticket.customer_email,
                subject: `Re: ${ticket.subject}`,
                html: emailHtml,
            });
        }

        const [updatedTicket] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
        res.json(updatedTicket[0]);
    } catch (error) {
        next(error);
    }
});

// --- API: DASHBOARD ---
app.get('/api/dashboard-stats', authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
// 1. Get the raw result

const [rows] = await db.query("SELECT SUM(total_amount) as totalRevenue, COUNT(id) as totalOrders FROM orders WHERE payment_status = 'paid'");
// 2. Extract values safely with a fallback
const totalRevenue = rows[0]?.totalRevenue || 0;
const totalOrders = rows[0]?.totalOrders || 0;
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(id) as totalUsers FROM users');
        const [[{ pendingOrders }]] = await db.query("SELECT COUNT(id) as pendingOrders FROM orders WHERE status = 'processing'");
        const [[{ openTickets }]] = await db.query("SELECT COUNT(id) as openTickets FROM support_tickets WHERE status = 'open' OR status = 'in_progress'");

       const [revenueData] = await db.query(`
    SELECT 
        DATE_FORMAT(created_date, '%a') as date, 
        SUM(total_amount) as revenue, 
        COUNT(id) as orders
    FROM orders 
    WHERE created_date >= CURDATE() - INTERVAL 6 DAY
    GROUP BY DATE_FORMAT(created_date, '%a'), DATE(created_date) 
    ORDER BY DATE(created_date) ASC;
`);

        const [statusData] = await db.query(`SELECT status as name, COUNT(id) as value FROM orders GROUP BY status;`);
        const [paymentRows] = await db.query(`
    SELECT 
        payment_method as name, 
        SUM(total_amount) as revenue 
    FROM orders 
    WHERE status = 'paid'
    GROUP BY payment_method
`);
        res.json({
            stats: {
                totalRevenue: totalRevenue || 0,
                totalOrders: totalOrders || 0,
                totalUsers: totalUsers || 0,
                pendingOrders: pendingOrders || 0,
                openTickets: openTickets || 0,
              },
            charts: {
                revenueData: revenueData.map(r => ({ ...r, date: r.date.charAt(0).toUpperCase() + r.date.slice(1) })),
                paymentData: paymentRows.map(p => ({...p, name: p.name.charAt(0).toUpperCase() + p.name.slice(1)})),
                statusData: statusData.map(s => ({...s, name: s.name.charAt(0).toUpperCase() + s.name.slice(1)})),
            }
        });
    } catch (error) {
        next(error);
    }
});

// --- STRIPE WEBHOOK ---
// Use express.raw for this specific endpoint to get the raw body for signature verification
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`❌ Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('✅ PaymentIntent was successful!', paymentIntent.id);

        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
            try {
                const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
                const order = orders[0];

                if (order && order.payment_status !== 'paid') {
                    await db.query("UPDATE orders SET status = 'processing', payment_status = 'paid' WHERE id = ?", [order.id]);
                    console.log(`Order ${orderId} updated to processing/paid via webhook.`);
                }
            } catch (dbError) {
                console.error('DB error updating order from webhook:', dbError);
                return res.status(500).json({ error: 'Database error during order update.' });
            }
        }
    }

    res.json({received: true});
});
// --- API: HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  try {
    // 1. Check Database Connection
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();

    // 2. Respond with Success
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(), // Uptime in seconds
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    // 3. Respond with Failure
    res.status(503).json({
      status: 'error',
      details: 'Database connection failed'
    });
  }
});



// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - send all requests to index.html
// This is the Express 5 compatible way to catch all routes
app.get('{/*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// --- ERROR HANDLING MIDDLEWARE ---
// This should be the LAST middleware.
app.use((err, req, res, next) => {
  console.error('----------------- ERROR -----------------');
  console.error(err);
  console.error('-----------------------------------------');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Only show stack in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server (HTTP + WebSocket) is running on port ${PORT}`);
});
