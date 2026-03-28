import './App.css';
import { AuthProvider } from './providers/AuthContext.jsx';
import AppRouter from './router/AppRouter.jsx';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
