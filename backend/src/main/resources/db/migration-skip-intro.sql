-- Skip Intro migration (SAFE: chỉ ADD COLUMN, không mất dữ liệu)
-- Chạy trong HeidiSQL / MySQL Workbench với database `thungphim` đang chọn.
--
-- Nếu một cột đã tồn tại, MySQL sẽ báo lỗi "Duplicate column name".
-- Bạn có thể bỏ qua lỗi đó và chạy tiếp các câu còn lại.

-- movies
ALTER TABLE movies ADD COLUMN intro_start_seconds DECIMAL(6,1) NULL;
ALTER TABLE movies ADD COLUMN intro_end_seconds DECIMAL(6,1) NULL;

-- series
ALTER TABLE series ADD COLUMN intro_source_episode_id INT NULL;
ALTER TABLE series ADD COLUMN intro_start_seconds DECIMAL(6,1) NULL;
ALTER TABLE series ADD COLUMN intro_end_seconds DECIMAL(6,1) NULL;

-- episodes (override theo tập)
ALTER TABLE episodes ADD COLUMN intro_mode VARCHAR(10) NOT NULL DEFAULT 'series';
ALTER TABLE episodes ADD COLUMN intro_start_seconds DECIMAL(6,1) NULL;
ALTER TABLE episodes ADD COLUMN intro_end_seconds DECIMAL(6,1) NULL;

