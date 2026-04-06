import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import {
  Users, User, Phone, Plus, Settings, X,
  Tag as TagIcon, MessageCircle,
  ChevronDown, LogOut, Store, Copy, Check,
  Pencil, Trash2, LayoutGrid, Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tag { id: string; name: string; color: string; }

interface Customer {
  id: string; lineUserId: string; fullName: string;
  profilePictureUrl: string; realName: string | null;
  phoneNumber: string | null; tags: Tag[];
  channelName: string; channelColor: string; channelId: string;
}

interface LineChannel {
  id: string; channelName: string;
  channelAccessToken: string; channelSecret: string; colorCode: string;
  hasToken?: boolean; hasSecret?: boolean;
}

interface JwtPayload { sub: string; role: string; exp: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rgba(hex: string, a: number): string {
  try {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  } catch { return `rgba(0,0,0,${a})`; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,25,23,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxWidth: wide ? 820 : 460, background: '#fff', border: '1.5px solid #E7E5E4', maxHeight: '90vh' }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, accent, onClose }: { icon: React.ReactNode; title: string; accent: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{ background: rgba(accent, 0.06), borderBottom: `1.5px solid ${rgba(accent, 0.18)}` }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: rgba(accent, 0.12), color: accent }}>
          {icon}
        </div>
        <h2 className="font-bold text-base" style={{ color: '#1C1917' }}>{title}</h2>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
        style={{ color: '#A8A29E' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F4')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [allTags, setAllTags]         = useState<Tag[]>([]);
  const [allChannels, setAllChannels] = useState<LineChannel[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  const [currentUser, setCurrentUser] = useState({ name: 'Loading...', role: '', isSuperAdmin: false });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchKeyword, setSearchKeyword]                 = useState('');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('');

  const [isTagModalOpen, setIsTagModalOpen]     = useState(false);
  const [newTagName, setNewTagName]             = useState('');
  const [newTagColor, setNewTagColor]           = useState('#F59E0B');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel]         = useState<LineChannel | null>(null);
  const [channelForm, setChannelForm] = useState({ name:'', token:'', secret:'', color:'#10B981' });
  const [channelError, setChannelError] = useState('');
  const [copiedId, setCopiedId]         = useState<string | null>(null);

  // Font injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    document.body.style.fontFamily = "'Sarabun', sans-serif";
    return () => { document.head.removeChild(link); document.body.style.fontFamily = ''; };
  }, []);

  // Fetch
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cRes, tRes, chRes] = await Promise.all([api.get('/customers'), api.get('/tags'), api.get('/channels')]);
      setCustomers(cRes.data); setAllTags(tRes.data); setAllChannels(chRes.data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };
  const fetchChannels = async () => { try { const r = await api.get('/channels'); setAllChannels(r.data); } catch(e){console.error(e);} };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const d = jwtDecode<JwtPayload>(token);
        setCurrentUser({ name: d.sub, role: d.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff', isSuperAdmin: d.role === 'SUPER_ADMIN' });
      } catch { handleLogout(); }
    } else { handleLogout(); }
    fetchData();
  }, []);

  const filteredCustomers = useMemo(() => customers.filter(c => {
    const ch = selectedChannelFilter === '' || String(c.channelId) === String(selectedChannelFilter);
    const kw = c.fullName?.toLowerCase().includes(searchKeyword.toLowerCase());
    return ch && kw;
  }), [customers, selectedChannelFilter, searchKeyword]);

  // Tag handlers
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try { await api.post('/tags', { name: newTagName, colorCode: newTagColor }); setNewTagName(''); fetchData(); }
    catch { alert('สร้างแท็กไม่สำเร็จ'); }
  };
  const handleDeleteTag = async (id: string) => {
    if (!confirm('ลบแท็กนี้?')) return;
    try { await api.delete(`/tags/${id}`); fetchData(); } catch { alert('ลบไม่สำเร็จ'); }
  };
  const toggleCustomerTag = async (customerId: string, tagId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) await api.delete(`/customers/${customerId}/tags/${tagId}`);
      else             await api.post(`/customers/${customerId}/tags/${tagId}`);
      const res = await api.get('/customers'); setCustomers(res.data);
      setSelectedCustomer(res.data.find((c: Customer) => c.id === customerId) ?? null);
    } catch { console.error('toggleTag error'); }
  };

  // Channel handlers
  const openCreateChannel = () => { setEditingChannel(null); setChannelForm({ name:'', token:'', secret:'', color:'#10B981' }); setChannelError(''); };
  const openEditChannel = (ch: LineChannel) => {
    setEditingChannel(ch); setChannelForm({ name: ch.channelName, token:'', secret:'', color: ch.colorCode ?? '#10B981' }); setChannelError('');
  };
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault(); setChannelError('');
    const body = { channelName: channelForm.name, channelAccessToken: channelForm.token, channelSecret: channelForm.secret, colorCode: channelForm.color };
    try {
      if (editingChannel) await api.put(`/channels/${editingChannel.id}`, body); else await api.post('/channels', body);
      openCreateChannel(); fetchChannels(); fetchData();
    } catch (err: any) { setChannelError(err?.response?.data?.message ?? 'บันทึกไม่สำเร็จ'); }
  };
  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`ลบ LINE OA "${name}"?`)) return;
    try { await api.delete(`/channels/${id}`); fetchChannels(); fetchData(); } catch { alert('ลบไม่สำเร็จ'); }
  };
  const copyWebhookUrl = async (id: string) => {
    try {
      const res = await api.get(`/channels/${id}/webhook-url`);
      await navigator.clipboard.writeText(res.data.webhookUrl);
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    } catch { alert('คัดลอกไม่สำเร็จ'); }
  };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Sarabun', sans-serif", background: '#FAFAF9', minHeight: '100vh' }}>

      {/* ════ TOPBAR ════ */}
      <header className="sticky top-0 z-30 px-8 flex items-center justify-between shadow-xl"
        style={{ background: 'linear-gradient(135deg,#1C1917 0%,#292524 100%)', borderBottom: '1px solid #44403C' }}>

        {/* Brand */}
        <div className="flex items-center gap-4 py-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            <LayoutGrid size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-white leading-none" style={{ fontSize: 17, letterSpacing: '-0.2px' }}>
              DD<span style={{ color: '#F59E0B' }}>Chat</span>Hub
            </p>
            <p style={{ color: '#A8A29E', fontSize: 11 }}>CRM · Customer Management</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <TopbarBtn to="/chat" color="#10B981" icon={<MessageCircle size={14} strokeWidth={2.5} />} label="ตอบแชท" />
          <TopbarBtn onClick={() => setIsTagModalOpen(true)} color="#818CF8" icon={<Settings size={14} strokeWidth={2.5} />} label="จัดการแท็ก" />
          {currentUser.isSuperAdmin && (
            <button onClick={() => { setIsChannelModalOpen(true); fetchChannels(); openCreateChannel(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1C1917' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <Store size={14} strokeWidth={2.5} /> จัดการ LINE OA
            </button>
          )}

          {/* Profile */}
          <div className="relative ml-1">
            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1C1917' }}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold leading-none" style={{ color: '#F5F5F4' }}>{currentUser.name}</p>
                <p style={{ color: '#F59E0B', fontSize: 11 }}>{currentUser.role}</p>
              </div>
              <ChevronDown size={13} style={{ color: '#78716C' }} className={`transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl py-2 z-50 overflow-hidden"
                  style={{ background: '#1C1917', border: '1px solid #44403C' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#44403C' }}>
                    <p className="text-sm font-semibold" style={{ color: '#F5F5F4' }}>{currentUser.name}</p>
                    <p style={{ color: '#F59E0B', fontSize: 12 }}>{currentUser.role}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                    style={{ color: '#FCA5A5' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <LogOut size={14} /> ออกจากระบบ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ════ MAIN ════ */}
      <main className="px-8 py-7 max-w-7xl mx-auto">

        {/* Page title + search */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-bold" style={{ fontSize: 22, color: '#1C1917', letterSpacing: '-0.3px' }}>ลูกค้าทั้งหมด</h1>
            <p style={{ color: '#78716C', fontSize: 13 }} className="mt-0.5">
              แสดง <span className="font-semibold" style={{ color: '#D97706' }}>{filteredCustomers.length}</span> / {customers.length} รายการ
            </p>
          </div>

          <div className="relative" style={{ width: 270 }}>
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A8A29E' }} />
            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า..."
              className="w-full py-2.5 pr-4 rounded-xl text-sm outline-none transition-all"
              style={{ paddingLeft: 38, border: '1.5px solid #E7E5E4', color: '#1C1917', background: '#fff', fontSize: 13 }}
              onFocus={e => (e.currentTarget.style.borderColor = '#F59E0B')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E7E5E4')} />
          </div>
        </div>

        {/* Channel pills */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <ChannelPill
            label="ทั้งหมด" count={customers.length}
            active={selectedChannelFilter === ''}
            onClick={() => setSelectedChannelFilter('')}
            color="#F59E0B" icon={<LayoutGrid size={12} />} />
          {allChannels.map(ch => {
            const color = ch.colorCode ?? '#6B7280';
            const count = customers.filter(c => String(c.channelId) === String(ch.id)).length;
            return (
              <ChannelPill key={ch.id} label={ch.channelName} count={count}
                active={selectedChannelFilter === ch.id}
                onClick={() => setSelectedChannelFilter(selectedChannelFilter === ch.id ? '' : ch.id)}
                color={color} />
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1.5px solid #E7E5E4', background: '#fff' }}>
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#F59E0B', borderTopColor: 'transparent' }} />
              <p style={{ color: '#A8A29E', fontSize: 13 }}>กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg,#FFFBEB,#FEF3C7)', borderBottom: '2px solid #FDE68A' }}>
                    {['ลูกค้า (LINE)', 'ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'ป้ายกำกับ'].map(h => (
                      <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-widest" style={{ color: '#92400E' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, idx) => {
                    const picUrl  = customer.profilePictureUrl || (customer as any).profile_picture_url;
                    const chColor = customer.channelColor || '#6B7280';
                    const even    = idx % 2 === 0;
                    return (
                      <tr key={customer.id}
                        style={{ background: even ? '#fff' : '#FAFAF9', borderBottom: '1px solid #F5F5F4', cursor: 'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                        onMouseLeave={e => (e.currentTarget.style.background = even ? '#fff' : '#FAFAF9')}>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                              style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
                              {picUrl
                                ? <img src={picUrl} alt={customer.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <User size={20} style={{ color: '#D97706' }} />}
                            </div>
                            <div>
                              <p className="font-semibold leading-tight" style={{ color: '#1C1917', fontSize: 14 }}>{customer.fullName}</p>
                              {customer.channelName && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-medium"
                                  style={{ fontSize: 11, background: rgba(chColor, 0.1), color: chColor, border: `1px solid ${rgba(chColor, 0.3)}` }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: chColor }} />
                                  {customer.channelName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4" style={{ color: '#57534E', fontSize: 14 }}>
                          {customer.realName || <span style={{ color: '#D4D0CD' }}>—</span>}
                        </td>

                        <td className="px-6 py-4" style={{ fontSize: 14 }}>
                          {customer.phoneNumber
                            ? <span className="flex items-center gap-1.5" style={{ color: '#57534E' }}><Phone size={13} style={{ color: '#A8A29E' }} />{customer.phoneNumber}</span>
                            : <span style={{ color: '#D4D0CD' }}>—</span>}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {customer.tags.map(tag => (
                              <span key={tag.id} className="px-2.5 py-1 text-xs rounded-full font-medium"
                                style={{ background: rgba(tag.color, 0.12), color: tag.color, border: `1px solid ${rgba(tag.color, 0.3)}` }}>
                                {tag.name}
                              </span>
                            ))}
                            <button onClick={() => setSelectedCustomer(customer)}
                              className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                              style={{ border: '1.5px dashed #D4D0CD', color: '#A8A29E' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.color = '#F59E0B'; e.currentTarget.style.background = '#FFFBEB'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4D0CD'; e.currentTarget.style.color = '#A8A29E'; e.currentTarget.style.background = 'transparent'; }}>
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 && !isLoading && (
                    <tr><td colSpan={4} className="py-16 text-center">
                      <Users size={36} style={{ color: '#E7E5E4', margin: '0 auto 10px' }} />
                      <p style={{ color: '#A8A29E', fontSize: 14 }}>ไม่พบลูกค้าที่ตรงกับเงื่อนไข</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ════ MODAL: Tag management ════ */}
      {isTagModalOpen && (
        <ModalOverlay onClose={() => setIsTagModalOpen(false)}>
          <ModalHeader icon={<Settings size={17} />} title="จัดการป้ายกำกับ" accent="#818CF8" onClose={() => setIsTagModalOpen(false)} />
          <div className="p-6">
            <form onSubmit={handleCreateTag} className="flex gap-2 mb-5">
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)}
                className="w-11 h-11 p-1 rounded-xl cursor-pointer" style={{ border: '1.5px solid #E7E5E4' }} />
              <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                placeholder="ชื่อแท็กใหม่ เช่น ลูกค้า VIP" required
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid #E7E5E4', color: '#1C1917' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#818CF8')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E7E5E4')} />
              <button type="submit" className="px-5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#6366F1,#818CF8)' }}>เพิ่ม</button>
            </form>
            <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #E7E5E4', maxHeight: 260, overflowY: 'auto' }}>
              {allTags.length === 0
                ? <p className="px-4 py-8 text-center text-sm" style={{ color: '#A8A29E' }}>ยังไม่มีแท็กในระบบ</p>
                : allTags.map((tag, i) => (
                  <div key={tag.id} className="flex items-center justify-between px-4 py-3"
                    style={{ background: i%2===0?'#fff':'#FAFAF9', borderBottom: i<allTags.length-1?'1px solid #F5F5F4':'none' }}>
                    <span className="px-3 py-1 text-xs rounded-full font-medium"
                      style={{ background: rgba(tag.color,0.12), color: tag.color, border:`1px solid ${rgba(tag.color,0.3)}` }}>
                      {tag.name}
                    </span>
                    <button onClick={() => handleDeleteTag(tag.id)} className="text-xs px-3 py-1 rounded-lg transition-all"
                      style={{ color: '#EF4444' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>ลบ</button>
                  </div>
                ))}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ════ MODAL: Customer tag picker ════ */}
      {selectedCustomer && (
        <ModalOverlay onClose={() => setSelectedCustomer(null)}>
          <ModalHeader icon={<TagIcon size={17} />} title="เลือกป้ายกำกับ" accent="#F59E0B" onClose={() => setSelectedCustomer(null)} />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: '#F59E0B', color: '#1C1917' }}>
                {selectedCustomer.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1C1917' }}>{selectedCustomer.fullName}</p>
                <p className="text-xs" style={{ color: '#92400E' }}>กำลังจัดการป้ายกำกับ</p>
              </div>
            </div>
            <div className="space-y-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
              {allTags.map(tag => {
                const isAssigned = selectedCustomer.tags.some(t => t.id === tag.id);
                return (
                  <div key={tag.id} onClick={() => toggleCustomerTag(selectedCustomer.id, tag.id, isAssigned)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                    style={{ border: isAssigned?`1.5px solid ${tag.color}`:'1.5px solid #E7E5E4', background: isAssigned?rgba(tag.color,0.06):'#fff' }}
                    onMouseEnter={e => !isAssigned && (e.currentTarget.style.background='#FAFAF9')}
                    onMouseLeave={e => !isAssigned && (e.currentTarget.style.background='#fff')}>
                    <span className="px-3 py-1 text-sm rounded-full font-medium"
                      style={{ background: rgba(tag.color,0.12), color: tag.color }}>{tag.name}</span>
                    {isAssigned && <Check size={16} style={{ color: tag.color }} strokeWidth={2.5} />}
                  </div>
                );
              })}
              {allTags.length === 0 && <p className="text-center text-sm py-6" style={{ color: '#A8A29E' }}>ยังไม่มีแท็กในระบบ</p>}
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: '#F5F5F4', color: '#57534E' }}
              onMouseEnter={e => (e.currentTarget.style.background='#E7E5E4')}
              onMouseLeave={e => (e.currentTarget.style.background='#F5F5F4')}>เสร็จสิ้น</button>
          </div>
        </ModalOverlay>
      )}

      {/* ════ MODAL: LINE OA management ════ */}
      {isChannelModalOpen && (
        <ModalOverlay onClose={() => setIsChannelModalOpen(false)} wide>
          <ModalHeader icon={<Store size={17} />} title="จัดการ LINE OA" accent="#F59E0B" onClose={() => setIsChannelModalOpen(false)} />
          <div className="flex gap-0 flex-1 overflow-hidden">

            {/* Left: List */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden border-r" style={{ borderColor: '#E7E5E4' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#A8A29E' }}>
                ช่องทางทั้งหมด ({allChannels.length})
              </p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {allChannels.length === 0 && (
                  <div className="py-12 text-center">
                    <Store size={28} style={{ color: '#E7E5E4', margin: '0 auto 8px' }} />
                    <p style={{ color: '#A8A29E', fontSize: 13 }}>ยังไม่มี LINE OA ในระบบ</p>
                  </div>
                )}
                {allChannels.map(ch => {
                  const color = ch.colorCode ?? '#6B7280';
                  const isEditing = editingChannel?.id === ch.id;
                  return (
                    <div key={ch.id} className="flex items-center gap-3 p-3.5 rounded-xl transition-all"
                      style={{ border: isEditing ? `1.5px solid ${color}` : '1.5px solid #E7E5E4', background: isEditing ? rgba(color, 0.05) : '#FAFAF9' }}>
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ background: color, boxShadow: `0 0 0 3px ${rgba(color, 0.2)}` }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1C1917' }}>{ch.channelName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: ch.hasToken ? rgba('#10B981',0.1) : rgba('#EF4444',0.1), color: ch.hasToken ? '#059669' : '#DC2626' }}>
                            {ch.hasToken ? '✓ Token' : '✗ ไม่มี Token'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn onClick={() => copyWebhookUrl(ch.id)} title="คัดลอก Webhook URL"
                          activeColor="#10B981" active={copiedId === ch.id}>
                          {copiedId === ch.id ? <Check size={14} /> : <Copy size={14} />}
                        </IconBtn>
                        <IconBtn onClick={() => openEditChannel(ch)} title="แก้ไข" hoverColor="#6366F1">
                          <Pencil size={14} />
                        </IconBtn>
                        <IconBtn onClick={() => handleDeleteChannel(ch.id, ch.channelName)} title="ลบ" hoverColor="#EF4444">
                          <Trash2 size={14} />
                        </IconBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Form */}
            <div className="w-80 flex-shrink-0 flex flex-col p-6 overflow-y-auto" style={{ background: '#FAFAF9' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#A8A29E' }}>
                {editingChannel ? '✏️ แก้ไข LINE OA' : '➕ เพิ่ม LINE OA ใหม่'}
              </p>
              <form onSubmit={handleSaveChannel} className="space-y-4 flex-1">
                <FormField label="ชื่อ LINE OA *">
                  <input type="text" required value={channelForm.name}
                    onChange={e => setChannelForm({...channelForm, name: e.target.value})}
                    placeholder="เช่น สาขาแจ้งวัฒนะ"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all bg-white"
                    style={{ border: '1.5px solid #E7E5E4', color: '#1C1917', fontSize: 13 }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#F59E0B')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E7E5E4')} />
                </FormField>

                <FormField label="สีประจำ LINE OA">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white"
                      style={{ border: '1.5px solid #E7E5E4' }}>
                      <span className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm" style={{ background: channelForm.color }} />
                      <span className="font-mono text-sm flex-1" style={{ color: '#57534E', fontSize: 12 }}>{channelForm.color}</span>
                    </div>
                    <input type="color" value={channelForm.color}
                      onChange={e => setChannelForm({...channelForm, color: e.target.value})}
                      className="w-11 h-11 rounded-xl cursor-pointer p-1 bg-white"
                      style={{ border: '1.5px solid #E7E5E4' }} />
                  </div>
                </FormField>

                <FormField label={`Channel Access Token${editingChannel ? ' (เว้นว่างถ้าไม่เปลี่ยน)' : ' *'}`}>
                  <textarea value={channelForm.token} rows={3}
                    onChange={e => setChannelForm({...channelForm, token: e.target.value})}
                    placeholder="วางค่าจาก LINE Developer Console..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono bg-white transition-all"
                    style={{ border: '1.5px solid #E7E5E4', color: '#1C1917', fontSize: 11, lineHeight: 1.6 }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#F59E0B')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E7E5E4')} />
                </FormField>

                <FormField label={`Channel Secret${editingChannel ? ' (เว้นว่างถ้าไม่เปลี่ยน)' : ' *'}`}>
                  <input type="text" value={channelForm.secret}
                    onChange={e => setChannelForm({...channelForm, secret: e.target.value})}
                    placeholder="Channel Secret"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono bg-white transition-all"
                    style={{ border: '1.5px solid #E7E5E4', color: '#1C1917', fontSize: 11 }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#F59E0B')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E7E5E4')} />
                </FormField>

                {channelError && (
                  <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                    {channelError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {editingChannel && (
                    <button type="button" onClick={openCreateChannel}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ background: '#fff', color: '#57534E', border: '1.5px solid #E7E5E4' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#F5F5F4')}
                      onMouseLeave={e => (e.currentTarget.style.background='#fff')}>ยกเลิก</button>
                  )}
                  <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity='0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
                    {editingChannel ? 'บันทึกการแก้ไข' : 'เพิ่ม LINE OA'}
                  </button>
                </div>
              </form>

              {/* Webhook hint */}
              <div className="mt-5 p-3.5 rounded-xl text-xs" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', lineHeight: 1.8 }}>
                <p className="font-semibold mb-1">💡 Webhook URL สำหรับ LINE Console</p>
                <code className="block break-all px-2 py-1.5 rounded-lg" style={{ fontSize: 10, background: '#FEF3C7' }}>
                  https://your-domain.com/api/v1/webhook/<strong>[ID สาขา]</strong>
                </code>
                <p className="mt-1.5 flex items-center gap-1">กด <Copy size={9} className="inline" /> หน้าสาขาเพื่อคัดลอก URL อัตโนมัติ</p>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────
function TopbarBtn({ to, onClick, color, icon, label }: { to?: string; onClick?: () => void; color: string; icon: React.ReactNode; label: string; }) {
  const cls = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all";
  const style = { background: rgba(color, 0.12), color, border: `1px solid ${rgba(color, 0.25)}` };
  const hover = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = rgba(color, 0.22));
  const leave = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.background = rgba(color, 0.12));
  if (to) return (
    <Link to={to} className={cls} style={style} onMouseEnter={hover} onMouseLeave={leave}>
      {icon} {label}
    </Link>
  );
  return (
    <button onClick={onClick} className={cls} style={style} onMouseEnter={hover} onMouseLeave={leave}>
      {icon} {label}
    </button>
  );
}

function ChannelPill({ label, count, active, onClick, color, icon }: { label: string; count: number; active: boolean; onClick: () => void; color: string; icon?: React.ReactNode; }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
      style={active
        ? { background: color, color: ['#F59E0B','#FCD34D'].includes(color) ? '#1C1917' : '#fff', border: `1.5px solid ${color}`, boxShadow: `0 2px 10px ${rgba(color, 0.35)}` }
        : { background: '#fff', color, border: `1.5px solid ${rgba(color, 0.35)}` }}>
      {icon || <span className="w-2 h-2 rounded-full" style={{ background: active ? (color === '#F59E0B' ? 'rgba(28,25,23,0.3)' : 'rgba(255,255,255,0.6)') : color }} />}
      {label}
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: active ? 'rgba(0,0,0,0.15)' : rgba(color, 0.12), color: active ? (color === '#F59E0B' ? '#1C1917' : '#fff') : color }}>
        {count}
      </span>
    </button>
  );
}

function IconBtn({ children, onClick, title, hoverColor, activeColor, active }: { children: React.ReactNode; onClick: () => void; title?: string; hoverColor?: string; activeColor?: string; active?: boolean; }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
      style={{ color: active && activeColor ? activeColor : '#A8A29E' }}
      onMouseEnter={e => { e.currentTarget.style.background = rgba(hoverColor ?? activeColor ?? '#6B7280', 0.1); e.currentTarget.style.color = hoverColor ?? activeColor ?? '#6B7280'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active && activeColor ? activeColor : '#A8A29E'; }}>
      {children}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#78716C' }}>{label}</label>
      {children}
    </div>
  );
}