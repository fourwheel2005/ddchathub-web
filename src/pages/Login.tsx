import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, User, Loader2, Smartphone, ShieldCheck } from 'lucide-react';
// 💡 1. Import ตัว Toast เข้ามา
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/login', {
        username: username,
        password: password
      });

      const token = response.data.token;
      localStorage.setItem('token', token);

      // 💡 2. แจ้งเตือนเมื่อสำเร็จ (ป๊อปอัปสีเขียว)
      toast.success('เข้าสู่ระบบสำเร็จ!', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });

      // หน่วงเวลาให้แอนิเมชัน Toast ทำงานแป๊บนึง ค่อยเปลี่ยนหน้า
      setTimeout(() => {
        navigate('/');
      }, 800);
      
    } catch (err: any) {
      // 💡 3. แจ้งเตือนเมื่อ Error (ป๊อปอัปสีแดง)
      if (err.response && err.response.status === 403) {
        toast.error('ชื่อผู้ใช้งาน หรือรหัสผ่านไม่ถูกต้อง');
      } else {
        toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดลองอีกครั้ง');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* 💡 4. วาง Component Toaster ไว้ตรงไหนก็ได้ในหน้าเว็บ เพื่อเป็นจุดปล่อยป๊อปอัป */}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 3000, // โชว์ 3 วินาทีแล้วหายไป
          className: 'text-sm font-medium shadow-lg',
        }}
      />

      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>

      {/* Card Container */}
      <div className="relative max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white p-8 sm:p-10 z-10">
        
        {/* หัวข้อและโลโก้ */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-6 transform transition hover:scale-105 duration-300">
            <Smartphone className="text-white h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            DD<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500">Mobile</span> CRM
          </h1>
          <p className="text-gray-500 text-sm font-medium">ระบบจัดการลูกค้าสัมพันธ์ระดับองค์กร</p>
        </div>

        {/* ❌ เอาโค้ดกล่อง Error สีแดงแบบเก่าออกไปแล้ว ❌ */}

        {/* ฟอร์ม Login */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 ml-1">ชื่อผู้ใช้งาน</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-500">
                <User className="h-5 w-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none transition-all duration-200 shadow-sm"
                placeholder="กรอกชื่อผู้ใช้งานของคุณ"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-sm font-semibold text-gray-700">รหัสผ่าน</label>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-500">
                <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none transition-all duration-200 shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative flex justify-center items-center gap-2 py-3.5 px-4 mt-8 rounded-xl text-sm font-bold text-gray-900 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                เข้าสู่ระบบอย่างปลอดภัย
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 font-medium">
            © 2026 DDMobile CRM System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}