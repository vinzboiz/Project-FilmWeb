import { useEffect, useRef } from 'react';

// Chỉ initialize Google một lần cho cả app (tránh warning "initialize() is called multiple times")
let googleAccountsInitialized = false;
const globalCallbackRef = { onSuccess: null, onError: null };

/** Nút Đăng nhập bằng Google - dùng Google Identity Services (GIS) */
export default function GoogleSignInButton({ onSuccess, onError, disabled = false }) {
  const containerRef = useRef(null);
  const renderedRef = useRef(false);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    globalCallbackRef.onSuccess = onSuccess;
    globalCallbackRef.onError = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!clientId || !containerRef.current || renderedRef.current) return;

    const initGoogle = () => {
      if (typeof window.google === 'undefined' || !window.google.accounts) {
        setTimeout(initGoogle, 100);
        return;
      }
      try {
        if (!googleAccountsInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res) => {
              if (res.credential) {
                globalCallbackRef.onSuccess?.(res.credential);
              } else {
                globalCallbackRef.onError?.(new Error('Không nhận được thông tin từ Google'));
              }
            },
            auto_select: false,
          });
          googleAccountsInitialized = true;
        }
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          locale: 'vi',
        });
        renderedRef.current = true;
      } catch (e) {
        globalCallbackRef.onError?.(e);
      }
    };

    initGoogle();
  }, [clientId]);

  if (!clientId) {
    return (
      <p style={{ fontSize: 12, color: '#888' }}>
        Đăng nhập Google chưa cấu hình (thêm VITE_GOOGLE_CLIENT_ID vào .env)
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    />
  );
}
