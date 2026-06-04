import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

export const authController = {
  // Register User
  async register(req, res) {
    const { username, email, password, avatar_url } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    try {
      // Check existing
      const existingEmail = await db.users.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }

      const existingUsername = await db.users.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await db.users.create({
        username,
        email,
        password_hash,
        avatar_url
      });

      // Create profile
      await db.profiles.create({
        user_id: user.id,
        xp: 0,
        coins: 0,
        level: 1,
        streak_count: 0
      });

      // Issue token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || 'super_secret_learnquest_rpg_key_2026',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Registration successful!',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'An error occurred during registration.' });
    }
  },

  // Login User
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const user = await db.users.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Issue token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || 'super_secret_learnquest_rpg_key_2026',
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'An error occurred during login.' });
    }
  },

  // Get current user profile
  async me(req, res) {
    try {
      const user = await db.users.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const profile = await db.profiles.findByUserId(user.id);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url
        },
        profile
      });
    } catch (err) {
      console.error('Me error:', err);
      res.status(500).json({ error: 'An error occurred fetching user data.' });
    }
  }
};
