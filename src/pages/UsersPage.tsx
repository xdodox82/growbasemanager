import { Navigate } from 'react-router-dom';

// Správa používateľov je v Nastaveniach → záložka Tím
const UsersPage = () => <Navigate to="/settings" replace />;

export default UsersPage;
