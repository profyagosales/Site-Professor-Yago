import { Navigate } from 'react-router-dom';
import { isAuthed } from '@/services/auth';

const Protected = ({ children }) => {
  if (!isAuthed()) {
    return <Navigate to="/login-professor" replace />;
  }
  return children;
};

export default Protected;

