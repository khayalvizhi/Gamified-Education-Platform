import { db } from '../config/db.js';

export const shopController = {
  // GET /api/shop/avatars
  async listAvatars(req, res) {
    try {
      const userId = req.user.id;
      const allAvatars = await db.avatars.findAll();
      const ownedList = await db.userAvatars.findByUserId(userId);
      const profile = await db.profiles.findByUserId(userId);
      const user = await db.users.findById(userId);

      const ownedMap = {};
      for (const ua of ownedList) {
        ownedMap[ua.avatar_id] = ua;
      }

      const avatarsWithStatus = allAvatars.map(avatar => ({
        ...avatar,
        owned: !!ownedMap[avatar.id],
        equipped: user?.avatar_url === avatar.image_url,
        custom_name: ownedMap[avatar.id]?.custom_name || null,
        can_afford: (profile?.coins || 0) >= avatar.price
      }));

      res.json({ avatars: avatarsWithStatus, coins: profile?.coins || 0 });
    } catch (err) {
      console.error('listAvatars error:', err);
      res.status(500).json({ error: 'Failed to list avatars.' });
    }
  },

  // GET /api/shop/my-avatars
  async myAvatars(req, res) {
    try {
      const userId = req.user.id;
      const ownedList = await db.userAvatars.findByUserId(userId);
      const allAvatars = await db.avatars.findAll();
      const user = await db.users.findById(userId);

      const ownedAvatarIds = new Set(ownedList.map(ua => ua.avatar_id));
      const ownedAvatarsData = allAvatars
        .filter(a => ownedAvatarIds.has(a.id))
        .map(avatar => {
          const ua = ownedList.find(u => u.avatar_id === avatar.id);
          return {
            ...avatar,
            owned: true,
            equipped: user?.avatar_url === avatar.image_url,
            custom_name: ua?.custom_name || null
          };
        });

      res.json({ avatars: ownedAvatarsData });
    } catch (err) {
      console.error('myAvatars error:', err);
      res.status(500).json({ error: 'Failed to fetch owned avatars.' });
    }
  },

  // POST /api/shop/buy
  async buyAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatar_id } = req.body;

      console.log('[BUY] body:', req.body, 'userId:', userId);

      if (!avatar_id) {
        console.log('[BUY] REJECTED: no avatar_id');
        return res.status(400).json({ error: 'avatar_id is required.' });
      }

      const avatar = await db.avatars.findById(avatar_id);
      console.log('[BUY] avatar found:', avatar?.name);
      if (!avatar) {
        console.log('[BUY] REJECTED: avatar not found for id:', avatar_id);
        return res.status(404).json({ error: 'Avatar not found.' });
      }

      const existing = await db.userAvatars.findByUserAndAvatar(userId, avatar_id);
      console.log('[BUY] existing ownership:', existing);
      if (existing) {
        console.log('[BUY] REJECTED: already owned');
        return res.status(400).json({ error: 'You already own this avatar.' });
      }

      const profile = await db.profiles.findByUserId(userId);
      console.log('[BUY] profile coins:', profile?.coins, 'avatar price:', avatar.price);
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });

      if (profile.coins < avatar.price) {
        console.log('[BUY] REJECTED: not enough coins');
        return res.status(400).json({ 
          error: 'Not enough coins.', 
          required: avatar.price, 
          current: profile.coins 
        });
      }

      const newCoins = profile.coins - avatar.price;
      await db.profiles.update(userId, { coins: newCoins });

      const ua = await db.userAvatars.create({ user_id: userId, avatar_id });

      res.json({
        message: 'Avatar purchased successfully!',
        avatar,
        user_avatar: ua,
        new_coins: newCoins
      });
    } catch (err) {
      console.error('[BUY] CRASH:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to purchase avatar.', detail: err.message });
    }
  },

  // POST /api/shop/equip
  async equipAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatar_id } = req.body;

      if (!avatar_id) return res.status(400).json({ error: 'avatar_id is required.' });

      const avatar = await db.avatars.findById(avatar_id);
      if (!avatar) return res.status(404).json({ error: 'Avatar not found.' });

      const owned = await db.userAvatars.findByUserAndAvatar(userId, avatar_id);
      if (!owned) return res.status(403).json({ error: 'You do not own this avatar.' });

      // Use custom_name for URL seed if it exists and is custom nameable
      let imageUrl = avatar.image_url;
      if (avatar.is_custom_nameable && owned.custom_name) {
        imageUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(owned.custom_name)}`;
      }

      // Update user avatar_url
      // Using db.users update — we need to update avatar_url directly on users
      // We'll call profiles update and also update user row
      const user = await db.users.findById(userId);
      if (user) {
        // Update avatar_url in users table
        await db.users.updateAvatarUrl(userId, imageUrl);
      }

      res.json({ message: 'Avatar equipped!', avatar_url: imageUrl });
    } catch (err) {
      console.error('equipAvatar error:', err);
      res.status(500).json({ error: 'Failed to equip avatar.' });
    }
  },

  // POST /api/shop/name
  async nameAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatar_id, custom_name } = req.body;

      if (!avatar_id || !custom_name) {
        return res.status(400).json({ error: 'avatar_id and custom_name are required.' });
      }

      // Validate custom_name: 3-20 chars, alphanumeric + spaces
      const nameRegex = /^[a-zA-Z0-9 ]{3,20}$/;
      if (!nameRegex.test(custom_name.trim())) {
        return res.status(400).json({ error: 'Custom name must be 3–20 characters and contain only letters, numbers, and spaces.' });
      }

      const avatar = await db.avatars.findById(avatar_id);
      if (!avatar || !avatar.is_custom_nameable) {
        return res.status(400).json({ error: 'This avatar is not custom nameable.' });
      }

      const owned = await db.userAvatars.findByUserAndAvatar(userId, avatar_id);
      if (!owned) return res.status(403).json({ error: 'You do not own this avatar.' });

      const updated = await db.userAvatars.updateCustomName(userId, avatar_id, custom_name.trim());

      res.json({ message: 'Custom name saved!', user_avatar: updated });
    } catch (err) {
      console.error('nameAvatar error:', err);
      res.status(500).json({ error: 'Failed to save custom name.' });
    }
  }
};
