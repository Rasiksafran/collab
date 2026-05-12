require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'adaptive_collab';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

const rooms = new Map();
const users = new Map();
let mongoClient = null;
let usersCollection = null;

async function initMongo() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Falling back to in-memory user auth store.');
    return;
  }

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(MONGODB_DB_NAME);
  usersCollection = db.collection('users');
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  console.log(`MongoDB connected: database "${MONGODB_DB_NAME}", collection "users"`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = uuidv4();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${id}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(isPdf ? null : new Error('Only PDF uploads are allowed'), isPdf);
  },
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function createRoomSnapshot(room, socketId) {
  const members = room.members.map((member) => ({
    socketId: member.socketId,
    username: member.username,
    bandwidthLevel: member.bandwidthLevel,
    isAdmin: room.adminSocketId === member.socketId,
    hasPen: member.hasPen || room.adminSocketId === member.socketId,
  }));

  return {
    roomId: room.roomId,
    pdfUrl: room.pdfUrl || null,
    filename: room.filename || null,
    adminSocketId: room.adminSocketId || null,
    members,
    currentUser: members.find((member) => member.socketId === socketId) || null,
    bandwidths: { ...room.bandwidths },
    whiteboardScale: room.whiteboardScale || 16,
  };
}

function broadcastRoomState(room) {
  room.members.forEach((member) => {
    const socket = io.sockets.sockets.get(member.socketId);
    if (socket) {
      socket.emit('room-state', createRoomSnapshot(room, member.socketId));
    }
  });
}

function leaveRoom(socket, reason = 'left') {
  const roomId = socket.data.roomId;
  if (!roomId) {
    return;
  }

  const room = getRoom(roomId);
  socket.data.roomId = null;

  if (!room) {
    return;
  }

  const index = room.members.findIndex((member) => member.socketId === socket.id);
  if (index !== -1) {
    const [removed] = room.members.splice(index, 1);
    delete room.bandwidths[socket.id];
    delete room.memberConnections?.[socket.id];
    socket.to(room.roomId).emit(reason === 'removed' ? 'user-removed' : 'user-left', {
      socketId: socket.id,
      username: removed.username,
      reason,
    });
  }

  if (room.adminSocketId === socket.id) {
    room.adminSocketId = room.members[0] ? room.members[0].socketId : null;
  }

  if (room.members.length === 0) {
    rooms.delete(room.roomId);
    return;
  }

  socket.leave(room.roomId);
  broadcastRoomState(room);
}

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.post('/api/room/create', async (req, res) => {
  try {
    const { password = '', username = '' } = req.body || {};
    const roomId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    rooms.set(roomId, {
      roomId,
      passwordHash,
      adminSocketId: null,
      pdfUrl: null,
      filename: null,
      members: [],
      bandwidths: {},
      whiteboardScale: 16,
      createdBy: username,
    });

    res.json({ roomId });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
});

app.post('/api/room/join', async (req, res) => {
  try {
    const { roomId, password = '' } = req.body || {};
    const room = getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const passwordMatches = await bcrypt.compare(password, room.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid room password' });
    }

    res.json({
      roomId: room.roomId,
      memberCount: room.members.length,
      pdfUrl: room.pdfUrl || null,
      filename: room.filename || null,
      adminSocketId: room.adminSocketId || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to join room' });
  }
});

app.post('/api/upload/pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'PDF file is required' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl, filename: req.file.originalname });
});

// Simple in-memory auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 10);
    const safeDisplayName = displayName || normalizedEmail.split('@')[0];

    if (usersCollection) {
      const existingUser = await usersCollection.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      await usersCollection.insertOne({
        email: normalizedEmail,
        displayName: safeDisplayName,
        passwordHash: hash,
        createdAt: new Date(),
      });
      return res.json({ ok: true, email: normalizedEmail, displayName: safeDisplayName });
    }

    if (users.has(normalizedEmail)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    users.set(normalizedEmail, { email: normalizedEmail, displayName: safeDisplayName, passwordHash: hash });
    return res.json({ ok: true, email: normalizedEmail, displayName: safeDisplayName });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    let user = null;
    if (usersCollection) {
      user = await usersCollection.findOne({ email: normalizedEmail });
    } else {
      user = users.get(normalizedEmail);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ ok: true, email: user.email, displayName: user.displayName });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', async ({ roomId, username, password }) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room-error', { message: 'Room not found' });
        return;
      }

      const passwordMatches = await bcrypt.compare(password || '', room.passwordHash);
      if (!passwordMatches) {
        socket.emit('room-error', { message: 'Invalid room password' });
        return;
      }

      const alreadyMember = room.members.find((member) => member.socketId === socket.id);
      if (!alreadyMember) {
        room.members.push({
          socketId: socket.id,
          username,
          bandwidthLevel: 'high',
          hasPen: false,
        });
      } else {
        alreadyMember.username = username;
      }

      if (!room.adminSocketId) {
        room.adminSocketId = socket.id;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.username = username;

      const snapshot = createRoomSnapshot(room, socket.id);
      socket.emit('room-state', snapshot);
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        username,
        bandwidthLevel: 'high',
        isAdmin: room.adminSocketId === socket.id,
      });
      broadcastRoomState(room);
    } catch (error) {
      socket.emit('room-error', { message: error.message || 'Unable to join room' });
    }
  });

  socket.on('leave-room', () => {
    leaveRoom(socket, 'left');
  });

  socket.on('draw-stroke', ({ roomId, strokeData }) => {
    socket.to(roomId).emit('receive-stroke', strokeData);
  });

  socket.on('erase-stroke', ({ roomId, objectId }) => {
    socket.to(roomId).emit('receive-erase', { objectId });
  });

  socket.on('clear-board', ({ roomId }) => {
    socket.to(roomId).emit('board-cleared');
  });

  socket.on('undo-stroke', ({ roomId, objectId }) => {
    socket.to(roomId).emit('receive-undo', { objectId });
  });

  socket.on('grant-pen', ({ roomId, targetSocketId }) => {
    const room = getRoom(roomId);
    if (!room || room.adminSocketId !== socket.id) {
      return;
    }

    const target = room.members.find((member) => member.socketId === targetSocketId);
    if (target) {
      target.hasPen = true;
      io.to(targetSocketId).emit('pen-granted', { roomId });
      broadcastRoomState(room);
    }
  });

  socket.on('revoke-pen', ({ roomId, targetSocketId }) => {
    const room = getRoom(roomId);
    if (!room || room.adminSocketId !== socket.id) {
      return;
    }

    const target = room.members.find((member) => member.socketId === targetSocketId);
    if (target) {
      target.hasPen = false;
      io.to(targetSocketId).emit('pen-revoked', { roomId });
      broadcastRoomState(room);
    }
  });

  socket.on('remove-user', ({ roomId, targetSocketId }) => {
    const room = getRoom(roomId);
    if (!room || room.adminSocketId !== socket.id) {
      return;
    }

    const target = io.sockets.sockets.get(targetSocketId);
    if (target) {
      io.to(targetSocketId).emit('user-removed', { roomId });
      target.disconnect(true);
    }
  });

  socket.on('bandwidth-report', ({ roomId, socketId, level }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }

    room.bandwidths[socketId] = level;
    const member = room.members.find((entry) => entry.socketId === socketId);
    if (member) {
      member.bandwidthLevel = level;
    }

    if (level === 'low') {
      io.to(socketId).emit('mute-mic', { reason: 'low-bandwidth' });
    }

    if (room.adminSocketId) {
      io.to(room.adminSocketId).emit('bandwidth-update', {
        roomId,
        bandwidths: { ...room.bandwidths },
        members: room.members.map((entry) => ({
          socketId: entry.socketId,
          username: entry.username,
          bandwidthLevel: entry.bandwidthLevel,
          isAdmin: room.adminSocketId === entry.socketId,
        })),
      });
    }

    broadcastRoomState(room);
  });

  socket.on('pdf-shared', ({ roomId, pdfUrl, filename }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }

    room.pdfUrl = pdfUrl;
    room.filename = filename || null;
    io.to(roomId).emit('receive-pdf', { pdfUrl, filename: room.filename });
    broadcastRoomState(room);
  });

  socket.on('pdf-page-change', ({ roomId, page }) => {
    socket.to(roomId).emit('receive-pdf-page', { page });
  });

  socket.on('transcription-text', ({ roomId, username, text }) => {
    socket.to(roomId).emit('receive-transcription', { username, text });
  });

  socket.on('whiteboard-scale', ({ roomId, scale }) => {
    const room = getRoom(roomId);
    if (!room) {
      return;
    }

    room.whiteboardScale = scale;
    socket.to(roomId).emit('receive-whiteboard-scale', { scale });
    broadcastRoomState(room);
  });

  socket.on('rtc-offer', ({ roomId, targetSocketId, offer }) => {
    io.to(targetSocketId).emit('rtc-offer', {
      fromSocketId: socket.id,
      roomId,
      offer,
    });
  });

  socket.on('rtc-answer', ({ roomId, targetSocketId, answer }) => {
    io.to(targetSocketId).emit('rtc-answer', {
      fromSocketId: socket.id,
      roomId,
      answer,
    });
  });

  socket.on('rtc-candidate', ({ roomId, targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('rtc-candidate', {
      fromSocketId: socket.id,
      roomId,
      candidate,
    });
  });

  socket.on('disconnect', () => {
    leaveRoom(socket, 'left');
  });
});

async function startServer() {
  try {
    await initMongo();
  } catch (err) {
    console.error(`MongoDB initialization failed: ${err.message}`);
    console.warn('Continuing with in-memory user auth store.');
  }

  server.listen(PORT, () => {
    console.log(`Adaptive collaboration server running on http://localhost:${PORT}`);
  });
}

startServer();
