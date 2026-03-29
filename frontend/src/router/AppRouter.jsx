import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ProfileSelectPage from '../pages/ProfileSelectPage.jsx';
import ContentDetailPage from '../pages/ContentDetailPage.jsx';
import PersonDetailPage from '../pages/PersonDetailPage.jsx';
import MyListPage from '../pages/MyListPage.jsx';
import FavoritesPage from '../pages/FavoritesPage.jsx';
import AdminAddMoviePage from '../pages/AdminAddMoviePage.jsx';
import AdminMoviesPage from '../pages/AdminMoviesPage.jsx';
import AdminEditMoviePage from '../pages/AdminEditMoviePage.jsx';
import AdminGenresPage from '../pages/AdminGenresPage.jsx';
import AdminPersonsPage from '../pages/AdminPersonsPage.jsx';
import AdminSeriesListPage from '../pages/AdminSeriesListPage.jsx';
import AdminAddSeriesPage from '../pages/AdminAddSeriesPage.jsx';
import AdminSeriesDetailPage from '../pages/AdminSeriesDetailPage.jsx';
import AdminEditSeriesPage from '../pages/AdminEditSeriesPage.jsx';
import AdminEditEpisodePage from '../pages/AdminEditEpisodePage.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import AdminUsersPage from '../pages/AdminUsersPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';
import GenresPage from '../pages/GenresPage.jsx';
import WatchEpisodePage from '../pages/WatchEpisodePage.jsx';
import WatchMoviePage from '../pages/WatchMoviePage.jsx';
import WatchHistoryPage from '../pages/WatchHistoryPage.jsx';
import AccountPage from '../pages/AccountPage.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAuth } from '../providers/AuthContext.jsx';

function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function UserRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={(
            <MainLayout>
              <HomePage />
            </MainLayout>
          )}
        />
        <Route
          path="/series"
          element={(
            <MainLayout>
              <HomePage />
            </MainLayout>
          )}
        />
        <Route
          path="/movies"
          element={(
            <MainLayout>
              <HomePage />
            </MainLayout>
          )}
        />
        <Route
          path="/browse/new"
          element={(
            <MainLayout>
              <HomePage />
            </MainLayout>
          )}
        />
        <Route
          path="/login"
          element={(
            <MainLayout>
              <LoginPage />
            </MainLayout>
          )}
        />
        <Route
          path="/register"
          element={(
            <MainLayout>
              <RegisterPage />
            </MainLayout>
          )}
        />
        <Route
          path="/profiles"
          element={(
            <MainLayout>
              <ProfileSelectPage />
            </MainLayout>
          )}
        />
        <Route
          path="/movies/:id"
          element={(
            <MainLayout>
              <ContentDetailPage />
            </MainLayout>
          )}
        />
        <Route
          path="/series/:id"
          element={(
            <MainLayout>
              <ContentDetailPage />
            </MainLayout>
          )}
        />
        <Route
          path="/persons/:id"
          element={(
            <MainLayout>
              <PersonDetailPage />
            </MainLayout>
          )}
        />
        <Route
          path="/my-list"
          element={(
            <UserRoute>
              <MainLayout>
                <MyListPage />
              </MainLayout>
            </UserRoute>
          )}
        />
        <Route
          path="/favorites"
          element={(
            <UserRoute>
              <MainLayout>
                <FavoritesPage />
              </MainLayout>
            </UserRoute>
          )}
        />
        <Route
          path="/search"
          element={(
            <MainLayout>
              <SearchPage />
            </MainLayout>
          )}
        />
        <Route
          path="/browse/:type"
          element={(
            <MainLayout>
              <HomePage />
            </MainLayout>
          )}
        />
        <Route
          path="/genres"
          element={(
            <MainLayout>
              <GenresPage />
            </MainLayout>
          )}
        />
        <Route
          path="/watch/movie/:id"
          element={(
            <UserRoute>
              <MainLayout>
                <WatchMoviePage />
              </MainLayout>
            </UserRoute>
          )}
        />
        <Route
          path="/watch/episode/:episodeId"
          element={(
            <UserRoute>
              <MainLayout>
                <WatchEpisodePage />
              </MainLayout>
            </UserRoute>
          )}
        />
        <Route
          path="/history"
          element={(
            <UserRoute>
              <MainLayout>
                <WatchHistoryPage />
              </MainLayout>
            </UserRoute>
          )}
        />
        <Route
          path="/account"
          element={(
            <MainLayout>
              <AccountPage />
            </MainLayout>
          )}
        />
        <Route
          path="/admin"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminDashboardPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/movies"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminMoviesPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/movies/new"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminAddMoviePage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/movies/:id/edit"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminEditMoviePage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/series"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminSeriesListPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/series/new"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminAddSeriesPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/series/:id/edit"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminEditSeriesPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/series/:id/episode/:episodeId/edit"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminEditEpisodePage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/series/:id"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminSeriesDetailPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/genres"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminGenresPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/persons"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminPersonsPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <AdminRoute>
              <MainLayout>
                <AdminUsersPage />
              </MainLayout>
            </AdminRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;


