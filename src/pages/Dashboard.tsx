import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
    Users, User, Phone, Plus, Settings, X, 
    Tag as TagIcon, MessageCircle, 
    ChevronDown, LogOut,Store // 💡 เพิ่ม 2 ตัวนี้
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
    channelName: string;
    channelColor: string;
    channelId: string;
  }

interface LineChannel {
    id: string;
    channelName: string;
    channelAccessToken: string;
    channelSecret: string;
    colorCode: string;
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

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [allChannels, setAllChannels] = useState<LineChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [newChannelForm, setNewChannelForm] = useState({ name: '', token: '', secret: '', color: '#10B981' });
  
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('');

  const filteredCustomers = React.useMemo(() => {
    return customers.filter(customer => {
      // แปลงเป็น String ทั้งคู่เพื่อป้องกันบั๊ก Type ไม่ตรงกัน
      return selectedChannelFilter === '' || String(customer.channelId) === String(selectedChannelFilter);
    });
  }, [customers, selectedChannelFilter]);

  const fetchCustomers = async (channelId: string = '') => {
    try {
      setIsLoading(true);
      const res = await api.get(`/customers?channelId=${channelId}`);
      setCustomers(res.data);
    } catch (error) {
      console.error('Error fetching customers', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(selectedChannelId); 
  }, [selectedChannelId]);

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

  const fetchChannels = async () => {
    try {
      const res = await api.get('/channels');
      setAllChannels(res.data);
    } catch (error) {
      console.error('Error fetching channels', error);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelForm.name || !newChannelForm.token || !newChannelForm.secret) return;

    try {
      await api.post('/channels', {
        channelName: newChannelForm.name,
        channelAccessToken: newChannelForm.token,
        channelSecret: newChannelForm.secret,
        colorCode: newChannelForm.color
      });
      
      // ล้างค่าในฟอร์ม
      setNewChannelForm({ name: '', token: '', secret: '', color: '#10B981' });
      
      fetchChannels(); 
      alert('เพิ่มสาขาใหม่เรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('เกิดข้อผิดพลาดในการสร้างสาขา');
    }
  };

 

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
          {/* 💡 แทรก ข้อ 3 ตรงนี้ครับ! (โชว์เฉพาะ Super Admin) */}
          {currentUser.role === 'Super Admin' && (
            <button 
              onClick={() => { setIsChannelModalOpen(true); fetchChannels(); }}
              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 flex items-center gap-2 font-medium transition-colors border border-purple-200"
            >
              <Store size={18} /> จัดการ LINE OA
            </button>
          )}
          {/* ----------------------------------------- */}
          
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
    

{/* ---------------- แถบกรองสาขา ---------------- */}
<div className="max-w-6xl mx-auto bg-white p-4 rounded-t-xl border border-gray-200 shadow-sm flex justify-between items-center mb-0">
        <div className="flex items-center gap-3">
          {/* 💡 แอบเพิ่ม (วงเล็บจำนวนสาขา) ไว้เช็กว่าข้อมูลมาถึงตรงนี้จริงๆ ไหม */}
          <label className="text-sm font-medium text-gray-700">กรองตามสาขา ({allChannels.length}):</label>
          <div className="relative">
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-800"
            >
              <option value="">📱 ดูทุกสาขา (All Channels)</option>
              
              {/* 🎯 จุดสำคัญ: ต้องใช้ ch.channelName ให้ตรงกับที่ Modal ใช้ครับ */}
              {allChannels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.channelName}
                </option>
              ))}

            </select>
            <Store className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={14} />
          </div>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          แสดงข้อมูล {customers.length} รายการ
        </div>
      </div>
      
      {/* ... โค้ดตาราง <table ...> เดิม ... */}
     {/* ตารางข้อมูล */}
     <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
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
                {/* 💡 จุดที่เปลี่ยน: ใช้ filteredCustomers.map แทน customers.map */}
                {filteredCustomers.map((customer) => {
                  const picUrl = customer.profilePictureUrl || (customer as any).profile_picture_url;

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                            {picUrl ? (
                              <img src={picUrl} alt={customer.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="text-gray-500" size={20} />
                            )}
                          </div>
                          
                          {/* 💡 จุดที่เปลี่ยน: เพิ่มป้าย Badge สาขาใต้ชื่อลูกค้า */}
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium text-gray-900 leading-none mt-1">{customer.fullName}</span>
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 border"
                              style={{ 
                                backgroundColor: customer.channelColor ? `${customer.channelColor}15` : '#f3f4f6', 
                                color: customer.channelColor || '#4b5563', 
                                borderColor: customer.channelColor ? `${customer.channelColor}30` : '#e5e7eb' 
                              }}
                            >
                              <Store size={10} /> {customer.channelName || 'LINE OA'}
                            </span>
                          </div>

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
                  );
                })}
                {/* ดักกรณีค้นหาแล้วไม่เจอใครเลย */}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      ไม่พบข้อมูลลูกค้าในสาขานี้
                    </td>
                  </tr>
                )}
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
      {/* 💡 แทรก ข้อ 4 ตรงนี้ครับ! (ใต้ Modal 2 และอยู่ก่อนปิด div สุดท้าย) */}
      {/* ----------------- MODAL 3: จัดการ LINE OA ----------------- */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-purple-700">
                <Store size={24} /> จัดการช่องทาง LINE OA
              </h2>
              <button onClick={() => setIsChannelModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg mb-4 text-sm text-purple-800 border border-purple-100">
              💡 <b>Webhook URL ของคุณคือ:</b> นำ URL นี้ไปใส่ใน LINE Developers 
              (อย่าลืมเติม ID สาขาต่อท้าย เช่น <code className="bg-white px-1 py-0.5 rounded text-black">https://your-domain.com/api/v1/webhook/<b>IDสาขา</b></code>)
            </div>

            {/* 💡 สิ่งที่เพิ่มเข้ามา: ฟอร์มสร้างสาขาใหม่ */}
            <form onSubmit={handleCreateChannel} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col gap-3">
              <h3 className="font-semibold text-gray-700">➕ เพิ่มสาขาใหม่</h3>
              <div className="flex gap-3">
                <input 
                  type="text" required placeholder="ชื่อสาขา (เช่น แจ้งวัฒนะ)" 
                  value={newChannelForm.name} onChange={e => setNewChannelForm({...newChannelForm, name: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <input 
                  type="color" value={newChannelForm.color} onChange={e => setNewChannelForm({...newChannelForm, color: e.target.value})}
                  className="w-10 h-10 p-0.5 border border-gray-300 rounded cursor-pointer" title="เลือกสีประจำสาขา"
                />
              </div>
              <input 
                type="text" required placeholder="Channel Access Token (ยาวๆ)" 
                value={newChannelForm.token} onChange={e => setNewChannelForm({...newChannelForm, token: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <input 
                type="text" required placeholder="Channel Secret" 
                value={newChannelForm.secret} onChange={e => setNewChannelForm({...newChannelForm, secret: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded transition-colors text-sm">
                บันทึกสาขาใหม่
              </button>
            </form>

      

            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">ชื่อสาขา</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">รหัสสี</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">ID สาขา (สำหรับ Webhook)</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allChannels.map(ch => (
                    <tr key={ch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.colorCode }}></div>
                        {ch.channelName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{ch.colorCode}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ch.id}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-500 hover:text-blue-700">แก้ไข</button>
                      </td>
                    </tr>
                  ))}
                  {allChannels.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">ยังไม่มีข้อมูลช่องทาง LINE OA</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setIsChannelModalOpen(false)}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
      {/* ----------------------------------------------------------- */}

    </div> // ⚠️ นี่คือ </div> บรรทัดสุดท้า

    
  );

  
  
}
