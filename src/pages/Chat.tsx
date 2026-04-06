import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, User, Search, Store, ArrowLeft, Loader2, MessageSquare, Filter, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../lib/api';

// --- Types ---
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface LineChannel {
  id: string;
  channelName: string;
  colorCode: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  channel: string;
  channelId: string;
  channelColor: string;
  tags: Tag[];
}

interface Message {
  id: string;
  content: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'ADMIN';
  createdAt: string;
}

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

export default function Chat() {
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  // State สำหรับ Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>(''); 
  
  // State เก็บ Master Data
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allChannels, setAllChannels] = useState<LineChannel[]>([]); 

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeChatIdRef = useRef<string | undefined>(undefined);

  // --- 1. โหลดข้อมูลเริ่มต้น ---
  const fetchInitialData = async () => {
    try {
      const [chatRes, tagsRes, channelsRes] = await Promise.all([
        api.get('/chats/summary'),
        api.get('/tags'),
        api.get('/channels') 
      ]);

      const formattedChats = chatRes.data.map((chat: any) => ({
        ...chat,
        tags: chat.tags || [],
        time: chat.time ? new Date(chat.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''
      }));
      
      setChatList(formattedChats);
      setAllTags(tagsRes.data);
      setAllChannels(channelsRes.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeChat) {
      activeChatIdRef.current = activeChat.id;
      fetchMessages(activeChat.id);
    } else {
      setMessages([]);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-chat'),
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/messages', (messageOutput) => {
          const newMessage = JSON.parse(messageOutput.body);
          const messageCustomerId = newMessage.customer?.id?.toString();
          
          if (messageCustomerId === activeChatIdRef.current) {
            setMessages((prev) => [...prev, newMessage]);
          }
          api.get('/chats/summary').then(res => {
              const formattedChats = res.data.map((chat: any) => ({
                ...chat,
                tags: chat.tags || [],
                time: chat.time ? new Date(chat.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''
              }));
              setChatList(formattedChats);
          });
        });
      },
    });

    stompClient.activate();
    return () => { stompClient.deactivate(); };
  }, []);

  const fetchMessages = async (customerId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/chats/customers/${customerId}/messages`);
      setMessages(res.data);
    } catch (err) {
      setError('ไม่สามารถดึงข้อความได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || isSending || !activeChat) return;
    setIsSending(true);
    try {
      await api.post(`/chats/${activeChat.id}/send`, { text: messageInput.trim() });
      setMessageInput('');
      await fetchMessages(activeChat.id);
    } catch (err) {
      setError('ส่งข้อความไม่สำเร็จ');
    } finally {
      setIsSending(false);
    }
  };

  // --- 2. Filter Logic ---
  const filteredChats = useMemo(() => {
    return chatList.filter((chat) => {
      const isMatchName = chat.name.toLowerCase().includes(searchKeyword.toLowerCase());
      const isMatchTag = selectedTagId === '' || chat.tags.some(tag => tag.id === selectedTagId);
      const isMatchChannel = selectedChannelId === '' || chat.channelId === selectedChannelId;
      
      return isMatchName && isMatchTag && isMatchChannel;
    });
  }, [chatList, searchKeyword, selectedTagId, selectedChannelId]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden selection:bg-amber-200 selection:text-amber-900">
      
      {/* ================= ฝั่งซ้าย: รายชื่อแชท ================= */}
      <div className="w-[380px] flex flex-col bg-white border-r border-gray-200 shadow-sm z-20">
        
        {/* Header แถบซ้าย */}
        <div className="px-5 py-4 bg-white flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">ข้อความลูกค้า</h1>
          </div>
        </div>

        {/* โซน Search & Filter */}
        <div className="px-5 py-4 bg-white border-b border-gray-100 space-y-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 focus:bg-white text-sm transition-all shadow-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <Store className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" size={16} />
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full pl-9 pr-2 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 appearance-none text-xs font-medium text-gray-700 cursor-pointer truncate transition-all shadow-sm"
              >
                <option value="">📱 ทุกสาขา</option>
                {allChannels.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.channelName}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 group">
              <Filter className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" size={16} />
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className="w-full pl-9 pr-2 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 appearance-none text-xs font-medium text-gray-700 cursor-pointer truncate transition-all shadow-sm"
              >
                <option value="">🏷️ ทุกป้ายกำกับ</option>
                {allTags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* รายชื่อแชท */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`p-4 cursor-pointer transition-all border-b border-gray-50 ${
                activeChat?.id === chat.id 
                  ? 'bg-amber-50/50 border-l-4 border-l-amber-500 shadow-sm relative' 
                  : 'hover:bg-gray-50 border-l-4 border-l-transparent bg-white'
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <h3 className={`text-sm truncate pr-2 ${activeChat?.id === chat.id ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                  {chat.name}
                </h3>
                <span className={`text-[11px] font-medium shrink-0 ${chat.unread > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {chat.time}
                </span>
              </div>
              
              <p className={`text-sm truncate mb-2.5 ${chat.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                {chat.lastMessage}
              </p>
              
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium bg-gray-50 border border-gray-200 text-gray-600"
                  >
                    <Store size={10} /> {chat.channel || 'ไม่ระบุ'}
                  </span>

                  {chat.tags.slice(0, 2).map(tag => (
                    <span 
                      key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-md truncate max-w-[80px] font-medium border"
                      style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                {chat.unread > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm">ไม่พบข้อความ</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= ฝั่งขวา: ห้องแชท ================= */}
      <div className="flex-1 flex flex-col relative bg-[#F9FAFB]">
        {/* ลายพื้นหลังแบบมินิมอล (ตาข่ายจางๆ) เพื่อให้อ่านง่าย ไม่ปวดตา */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div className="w-24 h-24 bg-gradient-to-tr from-amber-100 to-yellow-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MessageSquare size={40} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">ยินดีต้อนรับสู่ DDMobile Chat</h2>
            <p className="text-gray-500 text-sm">เลือกรายชื่อลูกค้าด้านซ้ายเพื่อเริ่มต้นบทสนทนา</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col relative z-10 h-full">
            
            {/* Header ห้องแชท */}
            <div className="h-20 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
              <div className="flex items-center gap-4">
                {/* รูปโปรไฟล์ Default แบบหรูหรา */}
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md shadow-amber-200 text-white font-bold text-lg border-2 border-white">
                  {activeChat.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 leading-tight">
                    {activeChat.name}
                    <div className="flex gap-1.5">
                      {activeChat.tags.map(tag => (
                        <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium shadow-sm" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </h2>
                  <p className="text-sm font-medium flex items-center gap-1.5 mt-1 text-gray-500">
                    <Store size={14} className="text-gray-400" /> 
                    ทักมาจาก: <span className="text-gray-700">{activeChat.channel}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* พื้นที่ข้อความ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                </div>
              )}
              
              {!isLoading && messages.map((msg, index) => {
                const isAdmin = msg.senderType === 'AGENT' || msg.senderType === 'ADMIN';
                // ตัดสินใจโชว์เวลาเฉพาะข้อความที่ห่างกันเพื่อความสะอาดตา (Optional)
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    
                    {!isAdmin && (
                       <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 shrink-0 flex items-center justify-center text-gray-500 text-xs font-bold mt-auto shadow-sm border border-white">
                         {activeChat.name.charAt(0)}
                       </div>
                    )}

                    <div className={`max-w-[65%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`px-5 py-3 shadow-sm text-[15px] leading-relaxed ${
                          isAdmin 
                            // 💡 สีของ Admin: เหลืองอำพัน ตัวหนังสือเทาเข้ม (อ่านง่ายสุดๆ)
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-gray-900 rounded-[20px] rounded-br-sm shadow-amber-500/20' 
                            // 💡 สีของ Customer: ขาวล้วน ขอบเทาอ่อน
                            : 'bg-white text-gray-800 rounded-[20px] rounded-bl-sm border border-gray-100 shadow-gray-200/50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[11px] font-medium text-gray-400">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isAdmin && <CheckCircle2 size={12} className="text-amber-500" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* แถบพิมพ์ข้อความ */}
            <div className="bg-white p-5 border-t border-gray-200 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-20">
              <div className="flex items-end gap-3 max-w-5xl mx-auto">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl focus-within:ring-2 focus-within:ring-amber-400/50 focus-within:border-amber-400 focus-within:bg-white transition-all shadow-inner">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' && !e.shiftKey) { 
                        e.preventDefault(); 
                        handleSend(); 
                      } 
                    }}
                    placeholder={`พิมพ์ข้อความตอบกลับ ${activeChat.name}... (Enter เพื่อส่ง, Shift+Enter เพื่อขึ้นบรรทัดใหม่)`}
                    className="w-full bg-transparent px-5 py-3.5 focus:outline-none text-[15px] text-gray-800 resize-none max-h-32 min-h-[52px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200"
                    rows={1}
                  />
                </div>
                
                <button
                  onClick={handleSend}
                  disabled={isSending || !messageInput.trim()}
                  className="mb-0.5 h-12 w-12 flex items-center justify-center bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:text-gray-500 text-amber-400 rounded-full transition-all duration-200 shadow-md active:scale-95 shrink-0"
                >
                  {isSending ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={20} className="ml-0.5" />}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}