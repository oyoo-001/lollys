import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useChatNotifications } from '@/lib/ChatNotificationContext';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Archive, Clock } from "lucide-react";

const fetchConversations = async () => {
  const res = await fetch('/api/chat/conversations', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

const fetchHistory = async (userId) => {
  const res = await fetch(`/api/chat/history/${userId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
};

const statusIcons = {
  active: <Clock className="w-4 h-4 text-green-500" />,
  resolved: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
  archived: <Archive className="w-4 h-4 text-stone-400" />,
};

// Main component for the admin live support page
const AdminLiveSupport = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState({}); // { userId: [messages] }
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineAdmins, setOnlineAdmins] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const ws = useRef(null);
  const typingTimeoutRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const { notifications, addNotification, removeNotification, setInitialNotifications } = useChatNotifications();
  const queryClient = useQueryClient();
  
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: fetchConversations,
    enabled: !!user,
    onSuccess: (data) => {
      const unreadUserIds = data.filter(c => c.unread_count > 0).map(c => c.id);
      setInitialNotifications(unreadUserIds);
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }) => {
      await fetch(`/api/chat/conversations/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => refetchConversations()
  });

  useEffect(() => {
    // Initialize the Audio object. You must place a sound file at /public/notification.mp3
    notificationSoundRef.current = new Audio('/notification.mp3');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || user?.role !== 'admin') {
      return;
    }

    const baseApiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const wsUrl = baseApiUrl.replace(/^http/, 'ws');
    ws.current = new WebSocket(`${wsUrl}?token=${token}`);

    ws.current.onopen = () => {
      console.log('Admin WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'message:from_user':
          // Add message to the correct conversation in state
          setMessages(prev => ({
            ...prev,
            [payload.conversation_id]: [...(prev[payload.conversation_id] || []), payload]
          }));
          // If not viewing this user, add a notification
          if (selectedUser?.id !== payload.conversation_id) {
            addNotification(payload.conversation_id);
            notificationSoundRef.current?.play().catch(e => console.error("Error playing notification sound:", e));
          }
          // Refetch conversations to update sidebar order and unread count
          refetchConversations();
          break;
        case 'typing:start:user':
          setTypingUsers(prev => new Set(prev).add(payload.userId));
          break;
        case 'typing:stop:user':
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(payload.userId);
            return newSet;
          });
          break;
        case 'chat:requested':
          // A user has initiated a chat from the widget
          addNotification(payload.id);
          notificationSoundRef.current?.play().catch(e => console.error("Error playing notification sound:", e));
          refetchConversations();
          break;
        case 'server:admins_online': // Full list on connect
          // Exclude the current user from the list
          setOnlineAdmins(payload.filter(admin => admin.id !== user.id));
          break;
        case 'server:admin_online': // Another admin connected
          if (payload.id !== user.id) { // Don't add self to the list
            setOnlineAdmins(prev => [...prev.filter(a => a.id !== payload.id), payload]);
          }
          break;
        case 'server:admin_offline': // An admin disconnected
          setOnlineAdmins(prev => prev.filter(admin => admin.id !== payload.id));
          break;
        default:
          break;
      }
    };

    ws.current.onclose = () => {
      console.log('Admin WebSocket disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('Admin WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [user, addNotification, refetchConversations]);

  useEffect(() => {
    if (!isConnected || !ws.current || !selectedUser || ws.current.readyState !== WebSocket.OPEN) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const payload = { to: selectedUser.id };

    if (input) {
      ws.current.send(JSON.stringify({ type: 'typing:start', payload }));
      typingTimeoutRef.current = setTimeout(() => {
        ws.current.send(JSON.stringify({ type: 'typing:stop', payload }));
        typingTimeoutRef.current = null;
      }, 2000); // 2 seconds of inactivity
    } else {
      ws.current.send(JSON.stringify({ type: 'typing:stop', payload }));
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [input, selectedUser, isConnected]);

  const handleSelectUser = async (userToSelect) => {
    setSelectedUser(userToSelect);
    // Fetch history for this user
    const history = await fetchHistory(userToSelect.id);
    setMessages(prev => ({
      ...prev,
      [userToSelect.id]: history
    }));
    // Mark as read on the client-side immediately
    removeNotification(userToSelect.id);
    refetchConversations(); // Update unread count in sidebar
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const messagePayload = {
      type: 'message:to_user',
      payload: {
        to: selectedUser.id,
        text: input,
      },
    };
    ws.current.send(JSON.stringify(messagePayload));

    // Add admin's own message to the chat window
    const adminMessage = { sender_id: user.id, message_text: input, is_from_admin: true, created_date: new Date().toISOString() };
    setMessages(prev => ({
      ...prev,
      [selectedUser.id]: [...(messages[selectedUser.id] || []), adminMessage]
    }));
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-stone-50">
      {/* User List Sidebar */}
      <aside className="w-80 border-r border-stone-200 bg-white flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">Support Center</h2>
          <p className="text-xs text-stone-400">
            Status: <span className={isConnected ? 'text-green-500' : 'text-red-500'}>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </p>
        </div>
        <div className="p-4 border-b">
          <h3 className="text-xs font-semibold uppercase text-stone-500 tracking-wider mb-2">Online Admins</h3>
          <div className="flex flex-wrap gap-2">
            {onlineAdmins.length > 0 ? onlineAdmins.map(admin => (
              <Badge key={admin.id} variant="secondary" className="font-normal flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                {admin.name}
              </Badge>
            )) : (
              <p className="text-xs text-stone-400">Just you right now.</p>
            )}
          </div>
        </div>
        <h2 className="font-bold text-base p-4 border-b bg-stone-50/75">Active Chats</h2>
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            <ul>
              {conversations.map(u => (
                <li key={u.id}>
                  <button
                    onClick={() => handleSelectUser(u)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-stone-100 border-b border-stone-100 flex justify-between items-center",
                      selectedUser?.id === u.id && "bg-amber-50 font-semibold",
                      u.status !== 'active' && "opacity-60 bg-stone-50"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="truncate">{u.name}</p>
                      {typingUsers.has(u.id) ? (
                        <p className="text-xs text-amber-600 italic truncate">typing...</p>
                      ) : (
                        <p className="text-xs text-stone-400 truncate">{u.id}</p>
                      )}
                    </div>
                    {notifications.has(u.id) && <Badge className="bg-red-500 text-white">New</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-stone-500 text-center mt-4">No conversations yet.</p>
          )}
        </div>
      </aside>

      {/* Chat Window */}
      <main className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <header className="p-4 border-b bg-white shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  {selectedUser.name}
                  {statusIcons[selectedUser.status]}
                </h3>
                <p className="text-xs text-stone-400 capitalize">{selectedUser.status} Conversation</p>
              </div>
              <Select 
                value={selectedUser.status} 
                onValueChange={(val) => statusMutation.mutate({ userId: selectedUser.id, status: val })}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </header>
            <ChatWindow 
              messages={messages[selectedUser.id] || []} 
              isTyping={typingUsers.has(selectedUser.id)}
            />
            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${selectedUser.name}...`}
                className="flex-grow border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={!isConnected}
              />
              <button
                type="submit"
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
                disabled={!isConnected || !input.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-500">
            <p>Select a user to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
};

// Chat window component
const ChatWindow = ({ messages, isTyping }) => {
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-grow p-4 overflow-y-auto">
      {messages.map((msg, index) => (
        <Message key={index} message={msg} />
      ))}
      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="flex flex-col max-w-md">
            <div className="rounded-lg p-3 bg-gray-200 text-gray-800">
              <p className="text-sm italic">User is typing...</p>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

// Message bubble component
const Message = ({ message }) => {
  const { message_text, is_from_admin, attachment_url } = message;
  const alignClass = is_from_admin ? 'justify-end' : 'justify-start';
  const bubbleClass = is_from_admin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800';
  const name = is_from_admin ? 'You (Admin)' : 'User';

  return (
    <div className={`flex ${alignClass} mb-4`}>
      <div className="flex flex-col max-w-md">
        <div className={`rounded-lg p-3 ${bubbleClass}`}>
          {attachment_url && (
            <div className="mb-2">
              <img src={attachment_url} alt="Attachment" className="rounded max-h-48 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(attachment_url, '_blank')} />
            </div>
          )}
          <p className="text-sm">{message_text}</p>
        </div>
        <span className={`text-xs text-gray-500 mt-1 ${is_from_admin ? 'text-right' : 'text-left'}`}>{name}</span>
      </div>
    </div>
  );
};

export default AdminLiveSupport;