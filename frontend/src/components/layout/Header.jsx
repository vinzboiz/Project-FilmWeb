import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { getProfileName, getProfileAvatar } from '../../apis/client';
import logoNetflix from '../../assets/logo/Netflix_Logo_PMS.png';
import NotificationBell from './NotificationBell.jsx';

const AVATAR_URL = (key) => `/assets/avatars/${key}.png`;
import '../../styles/components/header.css';

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const NotificationIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const menuRef = useRef(null);
  const typedOffHomeRef = useRef(false);
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const profileName = getProfileName();
  const profileAvatar = getProfileAvatar();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isHome = pathname === '/' || pathname === '/series' || pathname === '/movies' || pathname.startsWith('/browse/');
  const qFromUrl = searchParams.get('q') ?? '';

  const isActive = (target) => {
    if (target === '/') return pathname === '/';
    if (target === '/series' || target === '/movies' || target === '/genres' || target === '/my-list' || target === '/favorites') {
      return pathname === target || pathname.startsWith(`${target}/`);
    }
    if (target === '/browse/new') {
      return pathname === '/browse/new';
    }
    return false;
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Đồng bộ ô tìm kiếm với URL khi đang ở trang chủ; rời trang chủ thì xóa query để không bị redirect ngược
  useEffect(() => {
    if (isHome) {
      setSearchQuery(qFromUrl);
      typedOffHomeRef.current = false;
    } else {
      setSearchQuery('');
      typedOffHomeRef.current = false;
    }
  }, [isHome, qFromUrl]);

  // Gõ tìm kiếm: debounce rồi cập nhật URL (trang chủ) hoặc chuyển về trang chủ với q
  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchQuery.trim();
      if (isHome) {
        const current = searchParams.get('q') ?? '';
        if (q === current) return;
        if (q) setSearchParams({ q }, { replace: true });
        else setSearchParams({}, { replace: true });
      } else if (q && typedOffHomeRef.current) {
        navigate(`/?q=${encodeURIComponent(q)}`);
        setSearchOpen(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, isHome]);

  const onSearchChange = (e) => {
    if (!isHome) typedOffHomeRef.current = true;
    setSearchQuery(e.target.value);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/login');
  }

  return (
    <header className={`app-header${scrolled || !isHome ? ' app-header--scrolled' : ''}`}>
      <nav className="app-header-nav">
        <div className="header-left">
          <Link to="/" className="app-link-brand" onClick={scrollToTop}>
            <img src={logoNetflix} alt="ThungPhim" className="header-logo" />
          </Link>
          <Link
            to="/"
            onClick={scrollToTop}
            className={isActive('/') ? 'header-link header-link--active' : 'header-link'}
          >
            Trang chủ
          </Link>
          <Link
            to="/series"
            className={isActive('/series') ? 'header-link header-link--active' : 'header-link'}
          >
            Series
          </Link>
          <Link
            to="/movies"
            className={isActive('/movies') ? 'header-link header-link--active' : 'header-link'}
          >
            Phim
          </Link>
          <Link
            to="/browse/new"
            className={isActive('/browse/new') ? 'header-link header-link--active' : 'header-link'}
          >
            Mới &amp; phổ biến
          </Link>
          <Link
            to="/genres"
            className={isActive('/genres') ? 'header-link header-link--active' : 'header-link'}
          >
            Thể loại
          </Link>
          <Link
            to="/my-list"
            className={isActive('/my-list') ? 'header-link header-link--active' : 'header-link'}
          >
            Danh sách của tôi
          </Link>
          <Link
            to="/favorites"
            className={isActive('/favorites') ? 'header-link header-link--active' : 'header-link'}
          >
            Yêu thích
          </Link>
        </div>

        <div className="header-right" ref={searchWrapRef}>
          <div className={`header-search ${searchOpen ? 'header-search--open' : ''}`}>
            <button
              type="button"
              className="header-search-icon"
              aria-label="Mở tìm kiếm"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className="header-search-input"
              placeholder="Tìm phim, series..."
              value={searchQuery}
              onChange={onSearchChange}
              onFocus={() => setSearchOpen(true)}
              aria-label="Tìm kiếm"
            />
            {searchOpen && (
              <button
                type="button"
                className="header-search-close"
                aria-label="Đóng"
                onClick={() => setSearchOpen(false)}
              >
                ✕
              </button>
            )}
          </div>
          <NotificationBell />
          <div className="header-avatar-wrap" ref={menuRef}>
            <button
              type="button"
              className="header-avatar"
              title={profileName || 'Tài khoản'}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Menu tài khoản"
            >
              {profileAvatar ? (
                <img src={AVATAR_URL(profileAvatar)} alt="" />
              ) : (
                profileName ? profileName.charAt(0).toUpperCase() : 'U'
              )}
            </button>
            {menuOpen && (
              <div className="header-avatar-menu">
                <Link
                  to="/account"
                  className="header-avatar-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Thông tin tài khoản
                </Link>
                <Link
                  to="/profiles"
                  className="header-avatar-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Quản lý hồ sơ
                </Link>
                {isLoggedIn && isAdmin && (
                  <Link
                    to="/admin"
                    className="header-avatar-menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Quản trị website
                  </Link>
                )}
                {isLoggedIn ? (
                  <button
                    type="button"
                    className="header-avatar-menu-item header-avatar-menu-item--logout"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="header-avatar-menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;

