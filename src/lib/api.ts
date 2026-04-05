import axios from 'axios';

// สร้าง instance ของ axios พร้อมตั้งค่า URL เริ่มต้น
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
});

// ดักจับทุก Request ก่อนถูกส่งออกไป เพื่อแนบ Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;