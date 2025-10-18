import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';

const RequireAuth = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  if (role) {
    const normalizedRole = typeof user.role === 'string' ? user.role : (user.isTeacher ? 'teacher' : null);
    if (normalizedRole !== role) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default RequireAuth;
