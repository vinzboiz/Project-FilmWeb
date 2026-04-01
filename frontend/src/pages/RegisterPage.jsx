import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../providers/AuthContext";
import { api } from "../apis/client";
import GoogleSignInButton from "../components/GoogleSignInButton";
import "../styles/pages/auth.css";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [full_name, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api(
        "POST",
        "/api/auth/register",
        { email, password, full_name },
        { auth: false },
      );
      await login(email, password);
      navigate("/profiles");
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
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
    <section className="auth-page auth-page-register">
      <div className="auth-card">
        <h1 className="auth-title">Đăng ký</h1>
        <p className="auth-subtitle">
          Tạo tài khoản để lưu danh sách và theo dõi lịch sử xem.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-google-wrap auth-google-register">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(e) => setError(e.message)}
            disabled={loading}
          />
        </div>

        <div className="auth-divider">
          <span>hoặc đăng ký bằng email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Họ tên
            <input
              type="text"
              autoComplete="name"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="auth-input"
            />
          </label>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
            />
          </label>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch-text">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
