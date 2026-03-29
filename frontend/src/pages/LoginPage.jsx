import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../providers/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import "../styles/pages/auth.css";

function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "locked") {
      setError("Tài khoản đã bị khóa. Liên hệ quản trị viên.");
    } else if (reason === "expired") {
      setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/profiles");
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = useCallback(
    async (credential) => {
      setError("");
      setLoading(true);
      try {
        await loginWithGoogle(credential);
        navigate("/profiles");
      } catch (err) {
        setError(err.message || "Đăng nhập Google thất bại");
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate],
  );

  return (
    <section className="auth-page auth-page-login">
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">Chào mừng bạn quay lại với ThungPhim.</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </label>
          <label className="auth-label">
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </label>
          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <div className="auth-google-wrap">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(e) => setError(e.message)}
            disabled={loading}
          />
        </div>

        <p className="auth-switch-text">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
