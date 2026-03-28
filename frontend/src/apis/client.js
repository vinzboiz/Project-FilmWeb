const API_BASE = 'http://localhost:5000';

function getToken() {
  const raw = localStorage.getItem('token');
  if (raw == null || raw === '') return null;
  const t = String(raw).trim();
  return t.length > 0 ? t : null;
}

function getProfileId() {
  return localStorage.getItem('profileId');
}

function getProfileName() {
  return localStorage.getItem('profileName') || '';
}

function getProfileAvatar() {
  return localStorage.getItem('profileAvatar') || '';
}

function setProfileInfo(profileId, profileName, profileAvatar) {
  if (profileId != null) {
    localStorage.setItem('profileId', String(profileId));
    localStorage.setItem('profileName', profileName || '');
    localStorage.setItem('profileAvatar', profileAvatar || '');
  } else {
    localStorage.removeItem('profileId');
    localStorage.removeItem('profileName');
    localStorage.removeItem('profileAvatar');
  }
}

function getIsAdmin() {
  return localStorage.getItem('is_admin') === '1';
}

function setAdminFlag(isAdmin) {
  if (isAdmin) {
    localStorage.setItem('is_admin', '1');
  } else {
    localStorage.removeItem('is_admin');
  }
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function api(method, path, body, options = {}) {
  const { auth = true } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: getHeaders(auth),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || res.statusText || '';
    const clearAndRedirect = (reason) => {
      localStorage.removeItem('token');
      localStorage.removeItem('profileId');
      localStorage.removeItem('profileName');
      localStorage.removeItem('profileAvatar');
      localStorage.removeItem('is_admin');
      try {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?reason=' + (reason || 'expired');
        }
      } catch {
        /* bỏ qua nếu không chạy trong browser */
      }
    };
    if (res.status === 401 && auth && (msg.includes('Token không hợp lệ') || msg.includes('Thiếu token'))) {
      clearAndRedirect('expired');
    } else if (res.status === 403 && auth && msg.includes('Tài khoản đã bị khóa')) {
      clearAndRedirect('locked');
    }
    throw new Error(msg);
  }
  return data;
}

export async function apiFormData(method, path, formData, options = {}) {
  const { auth = true } = options;
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || res.statusText || '';
    const clearAndRedirect = (reason) => {
      localStorage.removeItem('token');
      localStorage.removeItem('profileId');
      localStorage.removeItem('profileName');
      localStorage.removeItem('profileAvatar');
      localStorage.removeItem('is_admin');
      try {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?reason=' + (reason || 'expired');
        }
      } catch {
        /* ignore */
      }
    };
    if (res.status === 401 && auth && (msg.includes('Token không hợp lệ') || msg.includes('Thiếu token'))) {
      clearAndRedirect('expired');
    } else if (res.status === 403 && auth && msg.includes('Tài khoản đã bị khóa')) {
      clearAndRedirect('locked');
    }
    throw new Error(msg);
  }
  return data;
}

/** Thông báo thân thiện khi upload fail do ERR_CONNECTION_RESET / Failed to fetch */
export function normalizeUploadError(err) {
  const msg = err?.message || String(err);
  if (/failed to fetch|load failed|networkerror|connection reset|err_connection_reset/i.test(msg)) {
    return 'Kết nối bị ngắt khi upload. Có thể do: (1) File quá lớn (>100GB), (2) Mạng không ổn định, (3) Server timeout. Thử file nhỏ hơn hoặc dán URL thay vì upload.';
  }
  return msg;
}

export { API_BASE, getToken, getProfileId, getProfileName, getProfileAvatar, setProfileInfo, getIsAdmin, setAdminFlag };

