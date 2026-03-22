-- ThungPhim Database Schema
-- Chạy file này sau khi tạo database để khởi tạo bảng
-- mysql -u root -p thungphim < schema.sql
-- hoặc: SOURCE schema.sql; (trong mysql client)

SET NAMES utf8mb4;

-- users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(191) NOT NULL,
    full_name VARCHAR(191) NOT NULL,
    avatar_url VARCHAR(191) NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_lang VARCHAR(191) NOT NULL DEFAULT 'vi',
    preferred_theme VARCHAR(191) NOT NULL DEFAULT 'dark',
    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    avatar VARCHAR(191) NULL,
    is_kids BOOLEAN NOT NULL DEFAULT FALSE,
    max_maturity_rating VARCHAR(191) NOT NULL DEFAULT '18+',
    pin_code VARCHAR(191) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_profiles_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- genres
CREATE TABLE IF NOT EXISTS genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL UNIQUE,
    description TEXT NULL,
    thumbnail_url VARCHAR(191) NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- movies
CREATE TABLE IF NOT EXISTS movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    short_intro VARCHAR(255) NULL,
    description TEXT NULL,
    release_year INT NULL,
    duration_minutes INT NULL,
    thumbnail_url VARCHAR(191) NULL,
    banner_url VARCHAR(191) NULL,
    trailer_url VARCHAR(191) NULL,
    trailer_youtube_url VARCHAR(191) NULL,
    video_url VARCHAR(191) NULL,
    rating DECIMAL(3,1) NULL,
    age_rating VARCHAR(191) NULL,
    country_code VARCHAR(10) NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- movie_genres
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- persons
CREATE TABLE IF NOT EXISTS persons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    avatar_url VARCHAR(191) NULL,
    biography TEXT NULL,
    person_type VARCHAR(20) NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- series
CREATE TABLE IF NOT EXISTS series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(191) NULL,
    banner_url VARCHAR(191) NULL,
    trailer_url VARCHAR(191) NULL,
    trailer_youtube_url VARCHAR(191) NULL,
    age_rating VARCHAR(191) NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INT NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    release_year INT NULL,
    country_code VARCHAR(10) NULL,
    duration_minutes INT NULL,
    rating DECIMAL(3,1) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- series_genres
CREATE TABLE IF NOT EXISTS series_genres (
    series_id INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (series_id, genre_id),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- seasons
CREATE TABLE IF NOT EXISTS seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    season_number INT NOT NULL,
    title VARCHAR(191) NULL,
    description TEXT NULL,
    INDEX idx_seasons_series (series_id),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- episodes
CREATE TABLE IF NOT EXISTS episodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    series_id INT NOT NULL,
    season_id INT NULL,
    episode_number INT NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NULL,
    thumbnail_url VARCHAR(191) NULL,
    video_url VARCHAR(191) NULL,
    release_date DATETIME(3) NULL,
    view_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NULL,
    INDEX idx_episodes_series (series_id),
    INDEX idx_episodes_season (season_id),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cast (cho cả movie và episode)
CREATE TABLE IF NOT EXISTS cast (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NULL,
    episode_id INT NULL,
    person_id INT NOT NULL,
    role VARCHAR(191) NOT NULL,
    INDEX idx_cast_movie (movie_id),
    INDEX idx_cast_episode (episode_id),
    UNIQUE KEY uniq_cast (movie_id, episode_id, person_id, role),
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    movie_id INT NULL,
    series_id INT NULL,
    episode_id INT NULL,
    added_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uniq_watchlist (profile_id, movie_id, series_id, episode_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- watch_history
CREATE TABLE IF NOT EXISTS watch_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    movie_id INT NULL,
    episode_id INT NULL,
    progress_seconds INT NOT NULL DEFAULT 0,
    watched_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_wh_profile (profile_id),
    INDEX idx_wh_movie (movie_id),
    INDEX idx_wh_episode (episode_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    profile_id INT NULL,
    movie_id INT NULL,
    episode_id INT NULL,
    series_id INT NULL,
    rating INT NOT NULL,
    comment TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- favorites
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    movie_id INT NOT NULL,
    added_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uniq_favorite (profile_id, movie_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- content_likes (like phim/series theo profile)
CREATE TABLE IF NOT EXISTS content_likes (
    profile_id INT NOT NULL,
    content_type VARCHAR(10) NOT NULL,
    content_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, content_type, content_id),
    INDEX idx_content_likes_content (content_type, content_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_notifications_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
