import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
    Users, User, Phone, Plus, Settings, X, 
    Tag as TagIcon, MessageCircle, 
    ChevronDown, LogOut // 💡 เพิ่ม 2 ตัวนี้
  } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// กำหนด Type ของข้อมูล
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface JwtPayload {
    sub: string; // subject (username)
    role: string; // role ที่เราเพิ่ง put เข้าไป
    exp: number;
  }

interface Customer {
  id: string;
  lineUserId: string;
  fullName: string;            
  profilePictureUrl: string;   
  realName: string | null;
  phoneNumber: string | null;
  tags: Tag[];
}

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  const [isSystemTagModalOpen, setIsSystemTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); 

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  

  

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [customersRes, tagsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/tags')
      ]);
      setCustomers(customersRes.data);
      setAllTags(tagsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [currentUser, setCurrentUser] = useState({ name: 'Loading...', role: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        
        console.log("ข้อมูลใน Token คือ:", decoded); 

        
        const displayRole = decoded.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff';

        setCurrentUser({
          name: decoded.sub, // เอา username มาโชว์เป็นชื่อ
          role: displayRole
        });
        
      } catch (error) {
        console.error('Invalid token format:', error);
        handleLogout(); // ถ้า Token พัง ให้เตะออกไปหน้า Login
      }
    } else {
      handleLogout(); // ถ้าไม่มี Token ก็เตะออกเช่นกัน
    }
    
    // เรียกดึงข้อมูลลูกค้าตามปกติ
    fetchData(); 
  }, []);

  const handleCreateSystemTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await api.post('/tags', { name: newTagName, color: newTagColor });
      setNewTagName('');
      fetchData(); 
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('สร้างแท็กไม่สำเร็จ');
    }
  };

  const handleDeleteSystemTag = async (tagId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบแท็กนี้? (แท็กนี้จะหายไปจากลูกค้าทุกคน)')) return;
    try {
      await api.delete(`/tags/${tagId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('ลบแท็กไม่สำเร็จ');
    }
  };

  const toggleCustomerTag = async (customerId: string, tagId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await api.delete(`/customers/${customerId}/tags/${tagId}`);
      } else {
        await api.post(`/customers/${customerId}/tags/${tagId}`);
      }
      
      const res = await api.get('/customers');
      setCustomers(res.data);
      
      const updatedCustomer = res.data.find((c: Customer) => c.id === customerId);
      setSelectedCustomer(updatedCustomer);
      
    } catch (error) {
      console.error('Error toggling tag:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
    {/* ส่วนหัว */}
    <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            ระบบจัดการลูกค้า
          </h1>
          <p className="text-gray-500 mt-1">DDMobile CRM Dashboard</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/chat"
            className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-2 font-medium border border-green-200 transition-colors"
          >
            <MessageCircle size={18} /> ตอบแชทลูกค้า
          </Link>

          <button 
            onClick={() => setIsSystemTagModalOpen(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2 font-medium transition-colors"
          >
            <Settings size={18} /> จัดการแท็ก
          </button>
          
          {/* ----------------- User Profile Dropdown ----------------- */}
          <div className="relative ml-2">
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-3 p-1.5 pl-2 pr-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* รูปโปรไฟล์ (ใช้ตัวอักษรตัวแรกของชื่อ) */}
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold text-gray-800 leading-none">{currentUser.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{currentUser.role}</p>
              </div>
              
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* เมนู Dropdown ที่จะโชว์ตอนกด */}
            {isProfileDropdownOpen && (
              <>
                {/* ฉากกั้นใสๆ ไว้กดปิดเวลาคลิกพื้นที่อื่น */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
                  </div>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} />
                    ออกจากระบบ
                  </button>
                </div>
              </>
            )}
          </div>
          {/* -------------------------------------------------------- */}

        </div>
      </div>

      {/* ตารางข้อมูล */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">ลูกค้า (LINE)</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">เบอร์โทรศัพท์</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">ป้ายกำกับ (Tags)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {  customers.map((customer) => {
                  
                  // 💡 ท่าไม้ตาย! ดักจับชื่อตัวแปรทั้งแบบ React และแบบที่อาจจะหลุดมาจาก Database
                  const picUrl = customer.profilePictureUrl || (customer as any).profile_picture_url;

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                            {picUrl ? (
                              <img 
                                src={picUrl} 
                                alt={customer.fullName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <User className="text-gray-500" size={20} />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{customer.fullName}</span>
                        </div>
                      </td>

                    <td className="px-6 py-4 text-gray-600">{customer.realName || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {customer.phoneNumber ? (
                        <span className="flex items-center gap-1"><Phone size={14} /> {customer.phoneNumber}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {customer.tags.map(tag => (
                          <span 
                            key={tag.id} 
                            className="px-2 py-1 text-xs rounded-md font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        <button 
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-6 h-6 rounded-full border border-dashed border-gray-400 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                          title="เพิ่มป้ายกำกับ"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    </tr>
                ); // ✅ 1. ต้องปิดวงเล็บของ return ก่อน
              })}  {/* ✅ 2. แล้วค่อยปิดปีกกาและวงเล็บของ map */}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------- MODAL 1: จัดการแท็กของระบบ ----------------- */}
      {isSystemTagModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> จัดการแท็กระบบ</h2>
              <button onClick={() => setIsSystemTagModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateSystemTag} className="flex gap-2 mb-6">
              <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-10 p-1 rounded cursor-pointer" />
              <input 
                type="text" 
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)} 
                placeholder="ชื่อแท็กใหม่ เช่น ลูกค้า VIP" 
                className="flex-1 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                required
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">เพิ่ม</button>
            </form>

            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded">
              <table className="w-full text-left">
                <tbody>
                  {allTags.map(tag => (
                    <tr key={tag.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 text-xs rounded-md font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}>
                          {tag.name}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleDeleteSystemTag(tag.id)} className="text-red-500 hover:text-red-700 text-sm">ลบ</button>
                      </td>
                    </tr>
                  ))}
                  {allTags.length === 0 && (<tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400 text-sm">ยังไม่มีแท็กในระบบ</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 2: เลือกแท็กให้ลูกค้า ----------------- */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><TagIcon size={20} /> เลือกแท็กให้ลูกค้า</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="mb-4 text-sm text-gray-600">
              กำลังจัดการแท็กให้: <span className="font-semibold text-gray-900">{selectedCustomer.fullName}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allTags.map(tag => {
                const isAssigned = selectedCustomer.tags.some(t => t.id === tag.id);
                
                return (
                  <div 
                    key={tag.id} 
                    onClick={() => toggleCustomerTag(selectedCustomer.id, tag.id, isAssigned)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isAssigned ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <span className="px-2 py-1 text-sm rounded-md font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                      {tag.name}
                    </span>
                    {isAssigned && <span className="text-blue-500 font-bold">✓</span>}
                  </div>
                );
              })}
              {allTags.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  ยังไม่มีแท็กในระบบ กรุณาไปสร้างใน "จัดการแท็กระบบ" ก่อน
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedCustomer(null)}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}

    </div>
  );
}