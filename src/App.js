import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('https://xavia.pro');

function App() {
  const [yourUserId, setYourUserId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [pendingNotification, setPendingNotification] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [youBlocked, setYouBlocked] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const loadSessionAndMessages = async () => {
    try {
      const res = await fetch(`https://xavia.pro/api/chats/sessions?userId=${yourUserId}`);
      const json = await res.json();
      const session = json.data.find(
        (s) =>
          (s.participant1_id === yourUserId && s.participant2_id === receiverId) ||
          (s.participant2_id === yourUserId && s.participant1_id === receiverId)
      );

      if (session) {
        setSessionId(session.id);
        setSessionStatus(session.status);
        setBlocked(
          session.status === 'BLOCKED' && session.participant2_id === yourUserId
        );
        setYouBlocked(
          session.status === 'BLOCKED' && session.participant1_id === yourUserId
        );

        const msgRes = await fetch(
          `https://xavia.pro/api/chats/sessions/${session.id}/messages`
        );
        const msgJson = await msgRes.json();
        setChatHistory(msgJson.data);
      } else {
        setSessionId(null);
        setSessionStatus(null);
        setBlocked(false);
        setYouBlocked(false);
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Lỗi khi load session:', error);
    }
  };

  const handleJoinRoom = async () => {
    if (!yourUserId || !receiverId) {
      alert('Vui lòng nhập ID');
      return;
    }
    socket.emit('joinRoom', yourUserId);
    await loadSessionAndMessages();
  };

  const handleSendMessage = () => {
    if (!message.trim() && !selectedFile) return;
    if (blocked) {
      alert('❌ Bạn đã bị block, không thể gửi tin nhắn');
      return;
    }
    socket.emit('sendMessage', {
      senderId: yourUserId,
      receiverId: receiverId,
      content: message.trim(),
      file: selectedFile
    });
    setMessage('');
    setSelectedFile(null);
  };

  const handleBlockUser = () => {
    if (!sessionId) return;
    socket.emit('blockUser', {
      sessionId,
      blockerId: yourUserId,
    });
    setSessionStatus('BLOCKED');
    setYouBlocked(true);
    setBlocked(false);
  };

  const handleUnblockUser = () => {
    if (!sessionId) return;
    socket.emit('unblockUser', {
      sessionId,
      unblockerId: yourUserId,
    });
    setSessionStatus('ACCEPTED');
    setYouBlocked(false);
  };

  const handleAcceptChat = () => {
    if (!sessionId) return;
    socket.emit('acceptChat', {
      sessionId,
      userId: yourUserId,
    });
    setSessionStatus('ACCEPTED');
    setBlocked(false);
  };

  useEffect(() => {
    socket.on('newMessage', (msg) => {
      setChatHistory((prev) => [...prev, msg]);
    });

    socket.on('messageSent', (msg) => {
      setChatHistory((prev) => [...prev, msg]);
    });

    socket.on('pendingMessageNotification', async ({ from, sessionId: sId, preview }) => {
      setPendingNotification({ from, preview });
      await loadSessionAndMessages();
    });

    socket.on('chatAccepted', ({ sessionId: acceptedId }) => {
      if (acceptedId === sessionId) {
        setSessionStatus('ACCEPTED');
        setBlocked(false);
        setYouBlocked(false);
      }
    });

    socket.on('youHaveBeenBlocked', ({ by }) => {
      setBlocked(true);
      alert(`❌ Bạn đã bị user ${by.slice(0, 6)} block.`);
    });

    socket.on('youHaveBeenUnblocked', ({ sessionId: sid }) => {
      if (sid === sessionId) {
        setBlocked(false);
        alert('✅ Bạn đã được unblock');
      }
    });

    socket.on('unblockConfirmed', ({ sessionId: sid }) => {
      if (sid === sessionId) {
        setYouBlocked(false);
      }
    });

    socket.on('errorMessage', (err) => {
      console.error('Lỗi:', err);
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('pendingMessageNotification');
      socket.off('chatAccepted');
      socket.off('youHaveBeenBlocked');
      socket.off('youHaveBeenUnblocked');
      socket.off('unblockConfirmed');
      socket.off('errorMessage');
    };
  }, [yourUserId, receiverId, sessionId]);

  return (
    <div style={styles.container}>
      <h1>Realtime Chat</h1>

      <div style={styles.formGroup}>
        <label>Your User ID:</label>
        <input
          value={yourUserId}
          onChange={(e) => setYourUserId(e.target.value)}
        />
      </div>

      <div style={styles.formGroup}>
        <label>Receiver ID:</label>
        <input
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
        />
      </div>

      <button onClick={handleJoinRoom}>Join Room & Load Chat</button>
      {!youBlocked && (
        <button onClick={handleBlockUser} style={{ marginLeft: 10, backgroundColor: '#f66' }}>
          🚫 Block Receiver
        </button>
      )}
      {youBlocked && (
        <button onClick={handleUnblockUser} style={{ marginLeft: 10, backgroundColor: '#4CAF50', color: 'white' }}>
          🔓 Unblock Receiver
        </button>
      )}
      {sessionStatus === 'PENDING' && (
        <button onClick={handleAcceptChat} style={{ marginLeft: 10, backgroundColor: '#4CAF50', color: '#fff' }}>
          ✅ Accept Chat
        </button>
      )}

      {sessionStatus && (
        <div style={{ marginTop: 10, fontWeight: 'bold' }}>
          🧾 Trạng thái chat: <span style={{ color: getStatusColor(sessionStatus) }}>{sessionStatus}</span>
        </div>
      )}

      {pendingNotification && (
        <div style={{ marginTop: 10, color: 'red' }}>
          🔔 Tin nhắn chờ từ user {pendingNotification.from.slice(0, 6)}: "
          {pendingNotification.preview}"
        </div>
      )}

      {blocked && (
        <div style={{ marginTop: 10, color: 'red' }}>
          ❌ Bạn đã bị block. Không thể gửi thêm tin nhắn.
        </div>
      )}

      <div style={styles.chatBox}>
        {chatHistory.map((chat) => (
          <div
            key={chat.id}
            style={{
              ...styles.message,
              alignSelf: chat.user_id === yourUserId ? 'flex-end' : 'flex-start',
              backgroundColor: chat.user_id === yourUserId ? '#dcf8c6' : '#eee',
            }}
          >
            {chat.user_id === yourUserId ? `Bạn: ${chat.message}` : `User: ${chat.message}`}
            {chat.Image?.url && (
              <div>
                <img src={chat.Image.url} alt="chat-img" style={{ maxWidth: 200, marginTop: 5 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={styles.formGroup}>
        <input
          style={{ width: '50%' }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập tin nhắn..."
          disabled={blocked}
        />
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setSelectedFile(reader.result); // base64
              };
              reader.readAsDataURL(file);
            }
          }}
          disabled={blocked}
        />
        <button onClick={handleSendMessage} disabled={blocked}>Send</button>
      </div>
    </div>
  );
}

export default App;

const getStatusColor = (status) => {
  switch (status) {
    case 'ACCEPTED': return 'green';
    case 'PENDING': return 'orange';
    case 'BLOCKED': return 'red';
    default: return 'black';
  }
};

const styles = {
  container: {
    width: 500,
    margin: '40px auto',
    fontFamily: 'Arial, sans-serif',
  },
  formGroup: {
    margin: '10px 0',
  },
  chatBox: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #ccc',
    height: 300,
    overflowY: 'auto',
    padding: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    maxWidth: '70%',
    margin: '5px 0',
    padding: '8px 12px',
    borderRadius: 6,
  },
};