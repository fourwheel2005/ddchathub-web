import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, User, Search, Store, ArrowLeft, Loader2, MessageSquare, Filter } from 'lucide-react';
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

interface Chat {
  id: string; // ID ของลูกค้า
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  channel: string;
  tags: Tag[]; // 💡 เพิ่ม Tags เข้ามาในแชท
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
  
  // 💡 State สำหรับตัวกรอง (Filters)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeChatIdRef = useRef<string | undefined>(undefined);

  // --- 1. โหลดข้อมูลเริ่มต้น (แชท + แท็กทั้งหมด) ---
  const fetchInitialData = async () => {
    try {
      const [chatRes, tagsRes] = await Promise.all([
        api.get('/chats/summary'),
        api.get('/tags') // ดึง Master Tags มาทำ Dropdown
      ]);

      const formattedChats = chatRes.data.map((chat: any) => ({
        ...chat,
        tags: chat.tags || [], // ป้องกันกรณี Backend ส่ง null มา
        time: chat.time ? new Date(chat.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''
      }));
      
      setChatList(formattedChats);
      setAllTags(tagsRes.data);
      
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- 2. โหลดข้อความในห้องแชท ---
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

  // --- 3. WebSocket ---
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
          // รีเฟรชรายชื่อแชทเมื่อมีข้อความใหม่ (โดยไม่ต้องโหลด Tags ใหม่)
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
    
    // 💡 จุดที่แก้: ใส่ปีกกา {} ครอบไว้ เพื่อปิดกั้นไม่ให้มัน return Promise ออกไป
    return () => {
      stompClient.deactivate();
    };
  }, []);

  // --- ฟังก์ชัน API ---
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

  // 💡 --- 4. ระบบคัดกรอง (Filter Logic) ---
  const filteredChats = useMemo(() => {
    return chatList.filter((chat) => {
      // เช็กเงื่อนไขการพิมพ์ค้นหาชื่อ
      const isMatchName = chat.name.toLowerCase().includes(searchKeyword.toLowerCase());
      // เช็กเงื่อนไขการเลือกแท็ก (ถ้าเป็นค่าว่าง '' ถือว่าผ่าน)
      const isMatchTag = selectedTagId === '' || chat.tags.some(tag => tag.id === selectedTagId);
      
      return isMatchName && isMatchTag;
    });
  }, [chatList, searchKeyword, selectedTagId]);


  return (
    <div className="flex h-screen bg-white">
      {/* ---------------- ฝั่งซ้าย: รายชื่อแชท ---------------- */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-800">กล่องข้อความ</h1>
          </div>
        </div>

        {/* 💡 โซน Search & Filter */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3 shadow-sm z-10">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm text-gray-700 cursor-pointer"
            >
              <option value="">🏷️ ดูทุกป้ายกำกับ (All Tags)</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* รายชื่อลูกค้าที่ผ่านการกรองแล้ว */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
              <Search size={32} className="mb-2 opacity-50" />
              ไม่พบการสนทนาที่ตรงกับเงื่อนไข
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${activeChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-100 border-l-4 border-l-transparent bg-white'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 truncate pr-2">{chat.name}</h3>
                  <span className="text-xs text-gray-500 shrink-0">{chat.time}</span>
                </div>
                <p className="text-sm text-gray-600 truncate mb-2">{chat.lastMessage}</p>
                
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Badge ช่องทาง */}
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md flex items-center gap-1 border border-gray-200">
                      <Store size={10} /> {chat.channel}
                    </span>
                    {/* 💡 Badges ของ Tags (โชว์สูงสุด 2 อันพอ ไม่ให้ล้น) */}
                    {chat.tags.slice(0, 2).map(tag => (
                      <span 
                        key={tag.id} 
                        className="text-[10px] px-1.5 py-0.5 rounded-md truncate max-w-[80px]"
                        style={{ backgroundColor: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}30` }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {chat.tags.length > 2 && (
                      <span className="text-[10px] text-gray-400">+{chat.tags.length - 2}</span>
                    )}
                  </div>

                  {chat.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------------- ฝั่งขวา: ห้องแชท ---------------- */}
      <div className="flex-1 flex flex-col bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <MessageSquare size={64} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">เลือกรายชื่อลูกค้าเพื่อเริ่มสนทนา</h2>
          </div>
        ) : (
          <>
            {/* Header ห้องแชท */}
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mr-4 border border-blue-200 text-blue-600 font-bold">
                  {activeChat.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    {activeChat.name}
                    {/* 💡 โชว์ Tags ทั้งหมดของลูกค้าคนนี้ใน Header แชทด้วย! */}
                    <div className="flex gap-1">
                      {activeChat.tags.map(tag => (
                        <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </h2>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                    <Store size={12} /> ทักมาจาก: {activeChat.channel}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading && (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
              )}
              {!isLoading && messages.map((msg) => {
                const isAdmin = msg.senderType === 'AGENT' || msg.senderType === 'ADMIN';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isAdmin ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-[10px] mt-1 block text-right ${isAdmin ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-gray-200 flex items-center gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                placeholder="พิมพ์ข้อความตอบกลับ... (Enter เพื่อส่ง)"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={isSending || !messageInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-3 rounded-full transition-colors shadow-md flex-shrink-0"
              >
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}