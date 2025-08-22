import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children, role }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role) {
    const userRole = localStorage.getItem('role');
    if (userRole !== role) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default RequireAuth;
