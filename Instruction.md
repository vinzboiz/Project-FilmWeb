# Project-FilmWeb Setup Instructions

Tai lieu nay huong dan chay du an tu dau sau khi clone, de han che loi moi truong.

## 1) Yeu cau moi truong

Can cai dat cac thanh phan sau:

- Git
- Java JDK 17 tro len (khuyen nghi JDK 21/22)
- Maven 3.9+
- Node.js 20+ va npm
- MySQL 8+
- FFmpeg (co trong PATH)

Kiem tra nhanh:

    java -version
    mvn -version
    node -v
    npm -v
    ffmpeg -version

Neu ffmpeg khong tim thay, can cai ffmpeg va them vao PATH truoc khi chay backend.

## 2) Clone source

    git clone <repo-url>
    cd Project-FilmWeb

## 3) Tao cac folder runtime can thiet

Du an can cac thu muc de luu upload va streaming. Neu thieu, hay tao truoc:

    mkdir uploads
    mkdir uploads\images
    mkdir uploads\videos
    mkdir streaming_video
    mkdir private_uploads
    mkdir private_uploads\hls-keys

Luu y:
- uploads/videos la noi chua video goc mp4.
- streaming_video la noi chua file da bam HLS (.m3u8, .ts) theo ten phim.
- private_uploads/hls-keys la noi chua key AES.

## 4) Khoi tao MySQL database

Mo MySQL va tao DB:

    CREATE DATABASE thungphim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

Import schema:

    mysql -u root -p thungphim < backend/src/main/resources/schema.sql

Neu da co DB cu, can dam bao du schema moi de backend khong loi.

## 5) Cau hinh backend

Backend doc cau hinh tu file:
- backend/src/main/resources/application.properties

Gia tri mac dinh dang su dung:
- DB host: 127.0.0.1
- DB port: 3306
- DB name: thungphim
- DB user: root
- DB password: 123456
- Backend port: 5000
- Allowed frontend origin: http://localhost:8080

Neu ban dung thong so khac, sua trong application.properties hoac set bien moi truong DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.

## 6) Chay backend

    cd backend
    mvn spring-boot:run -DskipTests

Kiem tra health:

    http://localhost:5000/api/health

Phai nhan duoc JSON status ok.

## 7) Cai va chay frontend

Mo terminal khac:

    cd frontend
    npm install
    npm run dev

Frontend mac dinh chay o:

    http://localhost:8080

Neu 8080 dang ban, Vite se nhay sang cong khac (vi du 8081). Khi do can:
- dong app dang chiem 8080, hoac
- cap nhat app.streaming.allowed-origin va app.streaming.allowed-referer-prefix trong backend cho dung cong frontend dang chay.

## 8) Luong streaming tu dong

He thong duoc cau hinh tu dong bam video:

1. Admin upload video vao uploads/videos.
2. Gan video_url cho phim/tap.
3. Backend tu dong bam sang HLS vao streaming_video/<ten-phim>/.
4. Khi xong, video_url duoc cap nhat sang dang /hls/<ten-phim>/index.m3u8.

Neu muon chay lai bam thu cong cho 1 phim/tap:

    POST /api/upload/reprocess-hls/movie/{movieId}
    POST /api/upload/reprocess-hls/episode/{episodeId}

Can token admin hop le.

## 9) Cac loi thuong gap va cach xu ly

### Loi frontend bao Failed to fetch / ERR_CONNECTION_REFUSED
- Kiem tra backend da chay tren port 5000 chua.
- Thu lai /api/health.

### Mo phim bi quay loading mai
- Kiem tra movie video_url da la /hls/.../index.m3u8 chua.
- Kiem tra folder streaming_video/<ten-phim> co index.m3u8 va segment_*.ts.
- Kiem tra ffmpeg co trong PATH.

### Frontend chay sang port 8081/8082
- Neu backend dang allow origin 8080, can sua lai allowed-origin cho dung cong thuc te hoac giai phong port 8080.

### Khong bam duoc video
- Xac nhan source file ton tai trong uploads/videos.
- Xem log backend de kiem tra ffmpeg command va quyen ghi thu muc.

## 10) Thu tu khoi dong de on dinh

Moi lan chay local, nen theo thu tu:

1. Chay MySQL
2. Chay backend
3. Chay frontend
4. Dang nhap va test xem phim

---

Neu ban can bo seed du lieu mau (users, movies, series, episodes), hay tao script SQL rieng va import sau khi chay schema.sql.
