# ThungPhim Backend

Spring Boot backend cho dự án ThungPhim, hỗ trợ đăng nhập Google OAuth2 và phân quyền `USER` / `ADMIN`.

## Tech Stack

- Java 17+
- Spring Boot 3.2.x
- Spring Security + OAuth2 Client (Google)
- Spring Data JPA
- MySQL
- Thymeleaf (view web login/dashboard)
- Maven

## Cấu trúc chính

- `src/main/java/com/thungphim/config`:
  - Cấu hình bảo mật và phân quyền route.
- `src/main/java/com/thungphim/security`:
  - Logic OAuth2 user service và success handler theo role.
- `src/main/java/com/thungphim/entity`:
  - Entity `User` map trực tiếp bảng `users` hiện có.
- `src/main/java/com/thungphim/repository`:
  - Repository truy cập bảng `users`.
- `src/main/java/com/thungphim/controller`:
  - View controller và API demo quyền user/admin.
- `src/main/resources/templates`:
  - UI đăng nhập và dashboard.
- `src/main/resources/static/css`:
  - CSS giao diện lấy ý tưởng GitHub (nền trắng, line rõ).

## Yêu cầu trước khi chạy

1. Có MySQL và tạo database (ví dụ: `thungphim`).
2. Import schema hiện có (không đổi cấu trúc dữ liệu):

```bash
mysql -u root -p thungphim < src/main/resources/schema.sql
```

3. Tạo OAuth2 credentials trên Google Cloud Console (Web application), thêm redirect URI:

```text
http://localhost:5000/login/oauth2/code/google
```

## Biến môi trường

- `DB_HOST` (mặc định `127.0.0.1`)
- `DB_PORT` (mặc định `3306`)
- `DB_NAME` (mặc định `thungphim`)
- `DB_USER` (mặc định `root`)
- `DB_PASSWORD` (mặc định rỗng)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Build

```bash
mvn clean package -DskipTests
```

## Run

```bash
mvn spring-boot:run
```

Hoặc chạy jar đã build:

```bash
java -jar target/thungphim-backend-1.0.0-SNAPSHOT.jar
```

## Luồng đăng nhập và phân quyền

1. Người dùng truy cập `/` hoặc `/login`.
2. Nhấn `Sign in with Google` -> OAuth2 callback.
3. Hệ thống lấy email từ Google và upsert vào bảng `users`:
   - User mới: mặc định `is_admin = false`.
   - User cũ: cập nhật thông tin cơ bản, giữ nguyên cấu trúc bảng.
4. Gán role runtime:
   - `ROLE_ADMIN` nếu `users.is_admin = true`
   - `ROLE_USER` nếu `users.is_admin = false`
5. Redirect sau login:
   - Admin -> `/admin/dashboard`
   - User -> `/user/dashboard`

## Route chính

- Public:
  - `GET /`
  - `GET /login`
  - `GET /css/**`
- User:
  - `GET /user/dashboard`
  - `GET /api/user/me`
- Admin:
  - `GET /admin/dashboard`
  - `GET /api/admin/ping`
