import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { api } from '../apis/client';
import '../styles/pages/profile-select.css';

const AVATARS = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5'];
const AVATAR_URL = (key) => `/assets/avatars/${key}.png`;
const MAX_PROFILES = 4;

/** Đảm bảo 4 profile có 4 avatar khác nhau (tránh trùng khi dữ liệu cũ) */
async function ensureUniqueAvatars(list, api) {
  const used = new Set();
  const toUpdate = [];
  for (const p of list.slice(0, MAX_PROFILES)) {
    let avatar = (p.avatar && AVATARS.includes(p.avatar)) ? p.avatar : null;
    if (!avatar || used.has(avatar)) {
      avatar = AVATARS.find((a) => !used.has(a)) || AVATARS[0];
      toUpdate.push({ id: p.id, avatar });
    }
    used.add(avatar);
  }
  for (const { id, avatar } of toUpdate) {
    await api('PUT', `/api/profiles/${id}`, { avatar });
  }
}

function ProfileSelectPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [avatarPickerId, setAvatarPickerId] = useState(null);
  const { token, setProfileId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfiles();
  }, [token, navigate]);

  useEffect(() => {
    if (!avatarPickerId) return;
    const close = () => setAvatarPickerId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [avatarPickerId]);

  async function loadProfiles() {
    try {
      let data = await api('GET', '/api/profiles');
      let list = Array.isArray(data) ? data : [];
      if (list.length < MAX_PROFILES) {
        for (let i = list.length; i < MAX_PROFILES; i++) {
          const name = String(i + 1);
          const avatar = AVATARS[i % AVATARS.length];
          await api('POST', '/api/profiles', { name, avatar });
        }
        data = await api('GET', '/api/profiles');
        list = Array.isArray(data) ? data : [];
      }
      const display = list.slice(0, MAX_PROFILES);
      await ensureUniqueAvatars(display, api);
      const after = await api('GET', '/api/profiles');
      setProfiles((Array.isArray(after) ? after : []).slice(0, MAX_PROFILES));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getAvatarForProfile(profile, index) {
    const key = profile.avatar && AVATARS.includes(profile.avatar)
      ? profile.avatar
      : AVATARS[index % AVATARS.length];
    return AVATAR_URL(key);
  }

  async function handleUpdateName(profileId) {
    if (editingId !== profileId || editingName.trim() === '') {
      setEditingId(null);
      return;
    }
    try {
      await api('PUT', `/api/profiles/${profileId}`, { name: editingName.trim() });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, name: editingName.trim() } : p))
      );
    } catch (err) {
      setError(err.message);
    }
    setEditingId(null);
    setEditingName('');
  }

  async function handleUpdateAvatar(profileId, avatarKey) {
    setAvatarPickerId(null);
    try {
      await api('PUT', `/api/profiles/${profileId}`, { avatar: avatarKey });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, avatar: avatarKey } : p))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditName(p) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  function handleSelect(profile) {
    const avatar = (profile.avatar && AVATARS.includes(profile.avatar)) ? profile.avatar : AVATARS[0];
    setProfileId(profile.id, profile.name, avatar);
    navigate('/');
  }

  if (!token) return null;
  if (loading) {
    return <div className="profile-select-loading">Đang tải...</div>;
  }

  const displayList = profiles.slice(0, MAX_PROFILES);

  return (
    <div className="profile-select-page">
      <h1>Chọn hồ sơ</h1>
      {error && <p className="profile-select-error">{error}</p>}

      <div className="profile-select-grid">
        {displayList.map((p, index) => (
          <div key={p.id} className="profile-card">
            <div
              className="profile-card-avatar-wrap profile-card-avatar-clickable"
              onClick={(e) => {
                e.stopPropagation();
                setAvatarPickerId(avatarPickerId === p.id ? null : p.id);
              }}
              title="Nhấn để đổi ảnh đại diện"
            >
              <img src={getAvatarForProfile(p, index)} alt="" />
              {avatarPickerId === p.id && (
                <div className="profile-avatar-picker" onClick={(e) => e.stopPropagation()}>
                  {AVATARS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="profile-avatar-picker-item"
                      onClick={() => handleUpdateAvatar(p.id, key)}
                    >
                      <img src={AVATAR_URL(key)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {editingId === p.id ? (
              <input
                type="text"
                className="profile-card-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleUpdateName(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName(p.id);
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditingName('');
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                className="profile-card-name"
                onClick={() => startEditName(p)}
                title="Nhấn để sửa tên"
              >
                {p.name}
              </div>
            )}
            <div className="profile-card-actions">
              <button type="button" onClick={() => handleSelect(p)}>
                Chọn
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfileSelectPage;
