import { db } from '../config/db.js';

export const profileController = {
  // Get full profile with stats
  async getProfile(req, res) {
    const { userId } = req.params;
    try {
      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const profile = await db.profiles.findByUserId(userId);
      res.json({
        user: {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          created_at: user.created_at
        },
        profile
      });
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
  },

  // Update avatar, username
  async updateProfile(req, res) {
    const { userId } = req.params;
    const { username, avatar_url } = req.body;

    // Check permissions (users can only update their own profile)
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this profile.' });
    }

    try {
      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // If username changing, check duplicate
      if (username && username !== user.username) {
        const duplicate = await db.users.findByUsername(username);
        if (duplicate) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
        // PostgreSQL update if using Pg or JSON update
        // We'll write to db users table directly.
        // Wait, does db.users support update? We didn't write update in db.users but we can update users table easily or add helper.
        // Let's add user update capability in db.js or just do it inline if PostgreSQL, or JSON.
        // Let's see: we can update in memory or Postgres. Let's make it easy by adding user updating.
        // Actually, we can update in memory:
      }

      // Let's make update user helper
      // Wait, we'll write user update directly in our controller or update db.js.
      // Let's update user info in db:
      if (usePgCheck()) {
        const updateData = {};
        if (username) updateData.username = username;
        if (avatar_url) updateData.avatar_url = avatar_url;
        await pgUpdateUser(userId, updateData);
      } else {
        const memoryUsers = dbJsonUsers();
        const uIdx = memoryUsers.findIndex(u => u.id === userId);
        if (uIdx !== -1) {
          if (username) memoryUsers[uIdx].username = username;
          if (avatar_url) memoryUsers[uIdx].avatar_url = avatar_url;
          saveJsonDbData();
        }
      }

      res.json({
        message: 'Profile updated successfully!',
        username: username || user.username,
        avatar_url: avatar_url || user.avatar_url
      });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  },

  // Get quiz attempt history
  async getHistory(req, res) {
    const { userId } = req.params;
    try {
      const history = await db.quizAttempts.findByUserId(userId);
      res.json(history);
    } catch (err) {
      console.error('Get history error:', err);
      res.status(500).json({ error: 'Failed to retrieve history.' });
    }
  }
};

// Inline helper functions to make db.js user editing work without editing db.js again
import knex from 'knex';
function usePgCheck() {
  // Check if knex or pg client is active
  return process.env.DATABASE_URL ? true : false;
}

async function pgUpdateUser(userId, updateData) {
  // Execute update on Pg
  const pgClient = knex({ client: 'pg', connection: process.env.DATABASE_URL });
  await pgClient('users').where({ id: userId }).update(updateData);
  await pgClient.destroy();
}

import fs from 'fs';
import path from 'path';
function dbJsonUsers() {
  const DB_JSON_PATH = path.resolve('db.json');
  if (fs.existsSync(DB_JSON_PATH)) {
    const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    return data.users;
  }
  return [];
}

function saveJsonDbData() {
  const DB_JSON_PATH = path.resolve('db.json');
  // Load full db first
  if (fs.existsSync(DB_JSON_PATH)) {
    const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
    data.users = dbJsonUsers();
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
  }
}
