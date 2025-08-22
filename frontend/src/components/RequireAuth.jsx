import { Navigate } from 'react-router-dom';

const getRoleFromToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))?.role;
  } catch {
    return null;
  }
};

const RequireAuth = ({ children, role }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role) {
    const userRole = getRoleFromToken(token);
    if (userRole !== role) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default RequireAuth;
