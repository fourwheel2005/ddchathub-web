import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard'; // 💡 จุดสำคัญ: ดึงไฟล์ Dashboard ตัวจริงมาใช้งาน
import Chat from './pages/Chat';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* กลุ่มหน้าที่ต้องล็อกอินถึงจะเข้าได้ */}
        <Route element={<ProtectedRoute />}>
          {/* 💡 ตรงนี้จะไปเรียกใช้หน้าตารางลูกค้าสวยๆ ที่เราเพิ่งทำ */}
          <Route path="/" element={<Dashboard />} /> 
          <Route path="/chat" element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;