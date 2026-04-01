import { Link } from 'react-router-dom';
import '../styles/pages/admin-dashboard.css';

function AdminDashboardPage() {
  return (
    <div className="admin-dashboard">
      <h1>Bảng điều khiển Admin</h1>
      <p className="admin-dashboard-intro">
        Tại đây bạn có thể truy cập nhanh tới tất cả khu vực quản trị: phim lẻ, phim bộ (series / season / tập),
        thể loại, danh sách của người dùng... Các trang bên dưới đều đã hỗ trợ thêm / sửa / xoá và upload file
        (ảnh, banner, video) từ local disk.
      </p>

      <div className="admin-dashboard-grid">
        <section className="admin-dashboard-card">
          <h2>Phim lẻ (Movies)</h2>
          <p>Thêm, sửa, xoá phim lẻ; upload ảnh bìa, banner ngang, trailer và video chính.</p>
          <div className="admin-dashboard-actions">
            <Link to="/admin/movies" className="admin-btn admin-btn--primary">Danh sách phim</Link>
            <Link to="/admin/movies/new" className="admin-btn admin-btn--secondary">+ Thêm phim mới</Link>
          </div>
        </section>

        <section className="admin-dashboard-card">
          <h2>Phim bộ (Series)</h2>
          <p>Quản lý phim bộ, seasons và tập phim; upload ảnh bìa series, ảnh và video cho từng tập.</p>
          <Link to="/admin/series" className="admin-btn admin-btn--primary">Quản lý phim bộ</Link>
        </section>

        <section className="admin-dashboard-card">
          <h2>Diễn viên (Persons)</h2>
          <p>Quản lý thông tin diễn viên, đạo diễn; thêm, sửa, xoá, upload ảnh và tiểu sử.</p>
          <Link to="/admin/persons" className="admin-btn admin-btn--primary">Quản lý diễn viên</Link>
        </section>

        <section className="admin-dashboard-card">
          <h2>Thể loại (Genres)</h2>
          <p>Thêm, sửa, xoá thể loại và ảnh bìa; dùng để gán cho phim.</p>
          <Link to="/admin/genres" className="admin-btn admin-btn--primary">Quản lý thể loại</Link>
        </section>

        <section className="admin-dashboard-card">
          <h2>Người dùng (Users)</h2>
          <p>Xem danh sách người dùng, avatar, loại đăng nhập (Email/Google), thêm/bỏ admin, khóa tài khoản.</p>
          <Link to="/admin/users" className="admin-btn admin-btn--primary">Quản lý người dùng</Link>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboardPage;

