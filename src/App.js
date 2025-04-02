// App.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [yourUserId, setYourUserId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const handleJoinRoom = async () => {
    if (!yourUserId || !receiverId) {
      alert('Vui lòng nhập ID');
      return;
    }

    console.log('🔗 Sending request to create/join chat...');

    const res = await fetch('https://xavia.pro/api/chat-supa/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant1_id: yourUserId, participant2_id: receiverId }),
    });
    const json = await res.json();
    console.log('📨 Response create/join chat:', json);

    if (json.status) {
      setSessionId(json.data.id);
      await loadMessages(json.data.id);
    }
  };

  const loadMessages = async (chatId) => {
    console.log('📥 Loading messages for chatId:', chatId);
    const res = await fetch(`https://xavia.pro/api/chat-supa/chats/${chatId}/messages`);
    const json = await res.json();
    console.log('📥 Loaded messages response:', json);

    if (json.status && Array.isArray(json.data)) {
      setChatHistory(json.data);
    } else {
      setChatHistory([]);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    const formData = new FormData();
    formData.append('chat_session_id', sessionId);
    formData.append('user_id', yourUserId);
    formData.append('message', message);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    console.log('📤 Sending message...');
    const res = await fetch('https://xavia.pro/api/chat-supa/chats/message', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    console.log('📤 Message sent response:', json);

    setMessage('');
    setSelectedFile(null);
  };

  // ✅ Supabase Realtime Subscription
  useEffect(() => {
    if (!sessionId) return;

    console.log('📡 Subscribing to realtime for sessionId:', sessionId);

    const channel = supabase
      .channel(`realtime:ChatSessionMessage:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ChatSessionMessage',
          filter: `chat_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('🔔 Realtime new message received:', payload.new);
          setChatHistory((prev) => [...prev, payload.new]);
        }
      )
      .subscribe((status) => {
        console.log('📶 Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      console.log('📴 Realtime subscription removed');
    };
  }, [sessionId]);

  return (
    <div style={styles.container}>
      <h2>📨 Supabase Realtime Chat</h2>

      <div style={styles.formGroup}>
        <label>Your User ID:</label>
        <input value={yourUserId} onChange={(e) => setYourUserId(e.target.value)} />
      </div>

      <div style={styles.formGroup}>
        <label>Receiver ID:</label>
        <input value={receiverId} onChange={(e) => setReceiverId(e.target.value)} />
      </div>

      <button onClick={handleJoinRoom}>🔗 Join or Create Chat</button>

      <div style={styles.chatBox}>
        {chatHistory.length === 0 ? (
          <p><i>Chưa có tin nhắn nào</i></p>
        ) : (
          chatHistory.map((chat) => (
            <div key={chat.id} style={styles.message}>
              <strong>{chat.user_id === yourUserId ? 'Bạn' : 'Họ'}:</strong> {chat.message}
              {chat.image_url && (
                <div>
                  <img src={chat.image_url} alt="chat-img" style={{ maxWidth: 200, marginTop: 5 }} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={styles.formGroup}>
        <input
          style={{ width: '50%' }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập tin nhắn..."
        />
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          accept="image/*"
        />
        <button onClick={handleSendMessage}>📤 Send</button>
      </div>
    </div>
  );
}

export default App;

const styles = {
  container: {
    width: 600,
    margin: '40px auto',
    fontFamily: 'Arial',
  },
  formGroup: {
    margin: '10px 0',
  },
  chatBox: {
    border: '1px solid #ccc',
    height: 300,
    overflowY: 'auto',
    padding: 10,
    margin: '20px 0',
    background: '#f9f9f9',
  },
  message: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#e1f5fe',
  },
};
