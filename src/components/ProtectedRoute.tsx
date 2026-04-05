import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  // ถ้าไม่มี Token ให้เตะกลับไปหน้า Login ทันที
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ถ้ามี Token ให้แสดงเนื้อหาข้างใน (Dashboard)
  return <Outlet />;
};

export default ProtectedRoute;