import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Paperclip, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SupportWidget = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const ws = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState(null); // { url, name }
  const [adminName, setAdminName] = useState(null);

  const botGreeting = {
    text: "Hello! I'm Lolly's Assistant. How can I help you today?",
    fromAdmin: true, // Treat bot as admin for styling
    isBot: true,
    options: [
      { text: "Talk to a Human", action: "start_chat" },
      { text: "Products", action: "navigate_shop" },
      { text: "About Us", action: "navigate_about" },
    ]
  };

  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([botGreeting]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (input) {
      ws.current.send(JSON.stringify({ type: 'typing:start' }));
      typingTimeoutRef.current = setTimeout(() => {
        ws.current.send(JSON.stringify({ type: 'typing:stop' }));
        typingTimeoutRef.current = null;
      }, 2000); // 2 seconds of inactivity
    } else {
      ws.current.send(JSON.stringify({ type: 'typing:stop' }));
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [input, isConnected]);
useEffect(() => {
  return () => {
    if (ws.current) {
      ws.current.close();
    }
  };
}, []);
  const fetchAndSetHistory = async () => {
    try {
      const res = await fetch('/api/chat/my-history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) return;
      const history = await res.json();
      const formattedHistory = history.map(msg => ({ text: msg.message_text, attachment: msg.attachment_url, fromAdmin: msg.is_from_admin }));
      setMessages(prev => [...formattedHistory, ...prev.filter(m => m.isBot)]);
    } catch (error) { console.error("Failed to fetch chat history", error); }
  };

  const connectWebSocket = (onOpenCallback) => {
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      console.error("No auth token found.");
      return;
    }

    // Use the Vite environment variable for the server URL, fallback to localhost
    const baseApiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const wsUrl = baseApiUrl.replace(/^http/, 'ws');
    ws.current = new WebSocket(`${wsUrl}?token=${token}`);

    ws.current.onopen = () => {
      setIsConnected(true);
      onOpenCallback?.();
    };
    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = (err) => console.error('WS Error:', err);
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'message:from_admin') {
        if (message.payload.admin_name) {
          setAdminName(message.payload.admin_name);
        }
        setMessages(prev => [...prev, { text: message.payload.message_text, attachment: message.payload.attachment_url, fromAdmin: true }]);
      } else if (message.type === 'typing:start:admin') {
        setIsTyping(true);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (message.type === 'typing:stop:admin') {
        setIsTyping(false);
      }
    };
  };

  const initiateHandoff = () => {
    if (isAuthenticated) {
      setMessages(prev => [...prev, { text: "Connecting you to an agent...", fromAdmin: true, isBot: true }]);
      setChatStarted(true);
      connectWebSocket(() => {
        ws.current.send(JSON.stringify({ type: 'chat:initiate' }));
        fetchAndSetHistory();
      });
    } else {
      setMessages(prev => [...prev, {
        text: "Please sign in to start a live chat with our support team.",
        fromAdmin: true, isBot: true, options: [{ text: "Sign In / Register", action: "navigate_auth" }]
      }]);
    }
  };

  const handleOptionClick = (action) => {
    switch (action) {
      case 'start_chat':
        initiateHandoff();
        break;
      case 'navigate_about':
        navigate(createPageUrl('About'));
        setIsOpen(false);
        break;
      case 'navigate_shop':
        navigate(createPageUrl('Shop'));
        setIsOpen(false);
        break;
      case 'navigate_auth':
        navigate('/auth');
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.file_url) {
        setAttachment({ url: data.file_url, name: file.name });
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  const handleBotResponse = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      let response = { text: "I'm not sure I understand. Would you like to speak to an admin?", options: [{ text: "Talk to Admin", action: "start_chat" }] };

      // Greetings
      if (/\b(hi|hello|hey|greetings|howdy)\b/.test(lower)) response = { text: "Hello there! Welcome to Lolly's Collection. Need help shopping?" };
      // Emotions
      else if (/\b(happy|good|great|awesome|love)\b/.test(lower)) response = { text: "That's wonderful! We love bringing joy to our customers." };
      else if (/\b(sad|bad|angry|upset|hate)\b/.test(lower)) response = { text: "I'm sorry to hear that. We're here to help make things right. Please talk to an admin.", options: [{ text: "Talk to Admin", action: "start_chat" }] };
      // Advertising / Products
      else if (/\b(buy|shop|product|collection|clothes|dress|shoes)\b/.test(lower)) response = { text: "We have an amazing collection of premium products! Check out our Shop page.", options: [{ text: "Go to Shop", action: "navigate_shop" }] };
      // Admin / Help request
      else if (/\b(admin|human|person|agent|help|support)\b/.test(lower)) {
        initiateHandoff();
        return;
      }

      setMessages(prev => [...prev, { ...response, fromAdmin: true, isBot: true }]);
    }, 800);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() || attachment) {
      const userMsg = { text: input || (attachment ? "Sent an attachment" : ""), attachment: attachment?.url, fromAdmin: false };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setAttachment(null);

      if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
      const messagePayload = { 
        type: 'message:to_admin', 
        payload: { 
          text: userMsg.text, 
          attachment: attachment?.url 
        } 
      };
      ws.current.send(JSON.stringify(messagePayload));
      } else {
        handleBotResponse(userMsg.text);
      }
    }
  };

  const toggleOpen = () => {
    if (isOpen && ws.current) {
      ws.current.close();
      setChatStarted(false);
      setIsConnected(false);
    }
    setIsOpen(!isOpen);
  };
  
  // Do not show for admin users, but show for guests and regular users.
  if (user?.role === 'admin') {
    return null;
  }

  return (
    <>
      <button
        onClick={toggleOpen}
        className="fixed bottom-5 right-5 bg-amber-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[999] hover:bg-amber-700 transition-transform hover:scale-110"
        aria-label="Open support chat"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-5 w-80 h-[28rem] bg-white rounded-lg shadow-2xl z-[999] flex flex-col">
          <header className="bg-amber-600 text-white p-3 rounded-t-lg flex items-center justify-between">
            <h3 className="font-bold">{isConnected ? 'Live Support' : "Lolly's Assistant"}</h3>
            <p className={`text-xs ${isConnected ? 'text-green-300' : 'text-stone-200'}`}>
              {isConnected ? (adminName ? `With ${adminName}` : 'Online') : 'Bot'}
            </p>
          </header>

          <div className="flex-1 p-3 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className={`flex mb-3 ${msg.fromAdmin ? 'justify-start' : 'justify-end'}`}>
                <div className={`rounded-lg py-2 px-3 max-w-[85%] ${msg.fromAdmin ? 'bg-stone-200 text-stone-800' : 'bg-blue-500 text-white'}`}>
                  {msg.attachment && (
                    <div className="mb-2">
                      <img src={msg.attachment} alt="Attachment" className="max-w-full rounded-md max-h-32 object-cover border border-black/10" />
                    </div>
                  )}
                  <p className="text-sm">{msg.text}</p>
                  {msg.isBot && msg.options && (
                    <div className="mt-2 space-y-1">
                      {msg.options.map((opt, i) => (
                        <button key={i} onClick={() => handleOptionClick(opt.action)} className="w-full text-left text-sm text-blue-600 bg-white p-2 rounded-md border hover:bg-blue-50">
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="rounded-lg py-2 px-3 max-w-[85%] bg-stone-200 text-stone-800">
                  <p className="text-sm italic">Admin is typing...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {(
            <div className="p-2 border-t">
              {attachment && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-stone-100 rounded-md text-xs text-stone-600">
                  <ImageIcon size={14} />
                  <span className="truncate max-w-[150px]">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="ml-auto text-stone-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex gap-2">
                <label className={`cursor-pointer p-2 text-stone-400 hover:text-amber-600 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={attachment ? "Add a caption..." : "Type a message..."}
                  className="flex-grow border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  className="bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
                  disabled={!input.trim() && !attachment}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportWidget;