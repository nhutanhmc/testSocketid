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
  const [sessionStatus, setSessionStatus] = useState('');

  const handleJoinRoom = async () => {
    if (!yourUserId || !receiverId) return alert('Vui lòng nhập ID');

    const res = await fetch('https://xavia.pro/api/chat-supa/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant1_id: yourUserId, participant2_id: receiverId })
    });
    const json = await res.json();
    if (json.status) {
      setSessionId(json.data.id);
      setSessionStatus(json.data.status);
      await loadMessages(json.data.id);
    }
  };

  const loadMessages = async (chatId) => {
    const res = await fetch(`https://xavia.pro/api/chat-supa/chats/${chatId}/messages`);
    const json = await res.json();
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
    if (selectedFile) formData.append('image', selectedFile);

    const res = await fetch('https://xavia.pro/api/chat-supa/chats/message', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.status) {
      setMessage('');
      setSelectedFile(null);
    }
  };

  const handleAccept = async () => {
    const res = await fetch('https://xavia.pro/api/chat-supa/chats/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: yourUserId })
    });
    const json = await res.json();
    if (json.status) {
      alert(json.message);
      setSessionStatus('ACCEPTED');
    }
  };

  const handleBlock = async () => {
    const res = await fetch('https://xavia.pro/api/chat-supa/chats/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: yourUserId })
    });
    const json = await res.json();
    if (json.status) {
      alert(json.message);
      setSessionStatus('BLOCKED');
    }
  };

  const handleUnblock = async () => {
    const res = await fetch('https://xavia.pro/api/chat-supa/chats/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId: yourUserId })
    });
    const json = await res.json();
    if (json.status) {
      alert(json.message);
      setSessionStatus('ACCEPTED');
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`realtime:ChatSessionMessage:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ChatSessionMessage',
        filter: `chat_session_id=eq.${sessionId}`
      }, (payload) => {
        setChatHistory((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  return (
    <div style={styles.container}>
      <h2>📨 Supabase Chat Realtime</h2>
      <div style={styles.formGroup}>
        <label>Your User ID:</label>
        <input value={yourUserId} onChange={(e) => setYourUserId(e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label>Receiver ID:</label>
        <input value={receiverId} onChange={(e) => setReceiverId(e.target.value)} />
      </div>
      <button onClick={handleJoinRoom}>🔗 Join or Create Chat</button>
      {sessionId && <p>🔄 Session Status: <strong>{sessionStatus}</strong></p>}
      {sessionId && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={handleAccept}>✅ Accept Chat</button>
          <button onClick={handleBlock}>🚫 Block User</button>
          <button onClick={handleUnblock}>🔓 Unblock</button>
        </div>
      )}

      <div style={styles.chatBox}>
        {chatHistory.length === 0 ? (
          <p><i>No messages</i></p>
        ) : chatHistory.map((msg) => (
          <div key={msg.id} style={styles.message}>
            <strong>{msg.user_id === yourUserId ? 'You' : 'Them'}:</strong> {msg.message}
            {msg.image_url && <img src={msg.image_url} alt="img" style={{ maxWidth: 200 }} />}
          </div>
        ))}
      </div>

      <div style={styles.formGroup}>
        <input style={{ width: '50%' }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type message..." />
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" />
        <button onClick={handleSendMessage}>📤 Send</button>
      </div>
    </div>
  );
}

export default App;

const styles = {
  container: { width: 600, margin: '40px auto', fontFamily: 'Arial' },
  formGroup: { margin: '10px 0' },
  chatBox: { border: '1px solid #ccc', height: 300, overflowY: 'auto', padding: 10, background: '#f9f9f9' },
  message: { marginBottom: 10, padding: 10, borderRadius: 5, backgroundColor: '#e1f5fe' },
};
