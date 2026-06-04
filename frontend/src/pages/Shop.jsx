import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Coins, Sparkles, Shield, User, Star, Edit3, Check } from 'lucide-react';

export default function Shop() {
  const { refreshMe } = useAuth();
  const [avatars, setAvatars] = useState([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [namingAvatarId, setNamingAvatarId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('lq_token');
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shop/avatars');
      setAvatars(res.data.avatars);
      setCoins(res.data.coins);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load shop items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuy = async (avatarId) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/shop/buy', { avatar_id: avatarId });
      setSuccess(res.data.message);
      await refreshMe();
      await loadData();
    } catch (err) {
      console.error('Buy error full response:', err.response?.data);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Purchase failed.';
      setError(msg);
    }
  };

  const handleEquip = async (avatarId) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/shop/equip', { avatar_id: avatarId });
      setSuccess(res.data.message);
      
      // Update global context by re-fetching profile
      await refreshMe();
      
      // Update local state directly so it reflects immediately on the UI
      setAvatars(prev => prev.map(a => ({
        ...a,
        equipped: a.id === avatarId
      })));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to equip avatar.');
    }
  };

  const handleSaveName = async (avatarId) => {
    try {
      setError('');
      setSuccess('');
      const res = await api.post('/shop/name', { avatar_id: avatarId, custom_name: customName });
      setSuccess(res.data.message);
      setNamingAvatarId(null);
      setCustomName('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save custom name.');
    }
  };

  const getRarityBadge = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-yellow-glow">Legendary</span>;
      case 'rare':
        return <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">Rare</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">Common</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-navy py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-navy py-8 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-black text-gold-light text-glow-gold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-gold" /> REWARDS SHOP
          </h1>
          <p className="text-gray-400 mt-1">Exchanging hard-earned Gold Coins for Legendary Avatars & Vanity.</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-950/40 border border-gold/30 px-4 py-2 rounded-lg text-gold-light font-bold text-lg">
          <Coins className="w-5 h-5 text-gold animate-pulse" />
          <span>{coins} Coins</span>
        </div>
      </div>

      {error && <div className="bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-950/50 border border-green-500/30 text-green-300 p-4 rounded-lg mb-6">{success}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {avatars.map(avatar => (
          <div 
            key={avatar.id} 
            className={`border rounded-xl bg-navy-dark/40 overflow-hidden flex flex-col items-center p-5 transition-all duration-300 hover:-translate-y-1 ${
              avatar.equipped 
                ? 'border-gold shadow-gold-glow bg-yellow-950/5' 
                : avatar.owned 
                  ? 'border-purple/30 bg-purple-950/5' 
                  : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Rarity & Price info */}
            <div className="w-full flex justify-between items-center mb-3">
              {getRarityBadge(avatar.rarity)}
              <div className="flex items-center gap-1 text-gold font-semibold text-sm">
                <Coins className="w-3.5 h-3.5 fill-gold/10" />
                <span>{avatar.price}</span>
              </div>
            </div>

            {/* Image display */}
            <div className="relative w-32 h-32 flex items-center justify-center bg-navy-light rounded-full border border-slate-800 p-2 mb-4 group overflow-hidden">
              <img 
                src={avatar.image_url} 
                alt={avatar.name} 
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
              />
              {avatar.equipped && (
                <div className="absolute -bottom-1 right-2 bg-gold text-navy-dark rounded-full p-1 border border-navy-dark shadow-gold-glow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Title / Name */}
            <div className="text-center flex-1 w-full mb-4">
              <h3 className="font-cinzel text-lg font-bold text-gray-200 tracking-wide line-clamp-1">{avatar.name}</h3>
              {avatar.custom_name && (
                <p className="text-purple-light font-medium text-xs mt-0.5 tracking-wider italic">"{avatar.custom_name}"</p>
              )}
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2 mt-auto">
              {avatar.owned ? (
                <>
                  {avatar.equipped ? (
                    <button disabled className="w-full py-2 bg-yellow-500/10 border border-yellow-500/20 text-gold text-xs font-bold uppercase rounded tracking-wider cursor-default">
                      Active Avatar
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEquip(avatar.id)}
                      className="w-full py-2 bg-purple border border-purple-light/20 hover:bg-purple-light text-white text-xs font-bold uppercase rounded tracking-wider transition-all hover:shadow-purple-glow"
                    >
                      Equip Avatar
                    </button>
                  )}

                  {avatar.is_custom_nameable && (
                    <div className="w-full mt-1">
                      {namingAvatarId === avatar.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Set custom name..."
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="flex-1 bg-navy-light border border-slate-700 px-2 py-1 text-xs rounded text-gray-200 outline-none focus:border-gold"
                            maxLength={20}
                          />
                          <button
                            onClick={() => handleSaveName(avatar.id)}
                            className="bg-gold hover:bg-gold-light text-navy-dark p-1 rounded transition-colors"
                            title="Save Name"
                          >
                            <Check className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setNamingAvatarId(avatar.id); setCustomName(avatar.custom_name || ''); }}
                          className="w-full py-1 border border-slate-700 hover:border-slate-600 text-gray-400 hover:text-gray-200 text-[10px] font-semibold uppercase rounded tracking-wider flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Rename Avatar
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handleBuy(avatar.id)}
                  disabled={!avatar.can_afford}
                  className={`w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase rounded tracking-wider transition-all ${
                    avatar.can_afford
                      ? 'bg-gold hover:bg-gold-light text-navy-dark hover:shadow-gold-glow'
                      : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Buy Avatar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
