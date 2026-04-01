import { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, getProfileId, setProfileInfo, setAdminFlag, getIsAdmin } from '../apis/client';
import { pushClientNotification } from '../utils/notificationsClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [profileId, setProfileIdState] = useState(() => localStorage.getItem('profileId'));
  const [isAdmin, setIsAdminState] = useState(() => getIsAdmin());

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setIsAdminState(false);
    }
  }, [token]);

  useEffect(() => {
    if (profileId != null) {
      localStorage.setItem('profileId', profileId);
    } else {
      localStorage.removeItem('profileId');
    }
  }, [profileId]);

  const login = async (email, password) => {
    const data = await api('POST', '/api/auth/login', { email, password }, { auth: false });
    setTokenState(data.token);
    if (data.user) {
      setUser(data.user);
      const admin = !!data.user.is_admin;
      setAdminFlag(admin);
      setIsAdminState(admin);
    }
    pushClientNotification('login', 'Bạn đã đăng nhập vào ThungPhim.');
    return data;
  };

  const loginWithGoogle = async (idToken) => {
    const data = await api('POST', '/api/auth/google', { id_token: idToken }, { auth: false });
    setTokenState(data.token);
    if (data.user) {
      setUser(data.user);
      const admin = !!data.user.is_admin;
      setAdminFlag(admin);
      setIsAdminState(admin);
    }
    pushClientNotification('login', 'Bạn đã đăng nhập vào ThungPhim (Google).');
    return data;
  };

  const register = async (email, password, full_name) => {
    const data = await api('POST', '/api/auth/register', { email, password, full_name }, { auth: false });
    return data;
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);
    setProfileIdState(null);
    setProfileInfo(null, null, null);
    setAdminFlag(false);
    setIsAdminState(false);
  };

  const setProfileId = (id, name, avatar) => {
    setProfileIdState(id ? String(id) : null);
    setProfileInfo(id || null, name || '', avatar || '');
  };

  const value = {
    token: token || getToken(),
    user,
    profileId: profileId != null ? profileId : getProfileId(),
    isLoggedIn: !!(token || getToken()),
    isAdmin,
    login,
    loginWithGoogle,
    register,
    logout,
    setProfileId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

