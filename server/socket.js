// ── Multiplayer Room / Relay Manager ────────────────────────────────────────────
// Manages Socket.IO rooms (tables) for real-time multiplayer.
// Acts as a relay: host client sends state snapshots, server broadcasts to
// other clients in the same room. Player actions are relayed both ways.

const ROOM_CODE_LEN = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 4;
const HOST_UPDATE_INTERVAL = 100; // ms between host state snapshots

// In-memory room store
const rooms = new Map();

function genCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function createRoom() {
  let code;
  do { code = genCode(); } while (rooms.has(code));
  const room = {
    code,
    players: [],      // { socketId, seatIndex, name }
    hostId: null,
    state: 'waiting', // waiting | playing
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function findNextSeat(room) {
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!room.players.find(p => p.seatIndex === i)) return i;
  }
  return -1;
}

function initSocket(httpServer) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket) => {
    let currentRoom = null;

    // ── Create Room ──────────────────────────────────────────────────────────
    socket.on('createRoom', (data, ack) => {
      data = data || {};
      if (currentRoom) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Already in a room' });
        return;
      }
      const room = createRoom();
      const seat = 0;
      room.players.push({ socketId: socket.id, seatIndex: seat, name: data.name || 'Player' });
      room.hostId = socket.id;
      room.state = 'waiting';
      socket.join(room.code);
      currentRoom = room.code;

      if (typeof ack === 'function') ack({
        ok: true,
        code: room.code,
        seatIndex: seat,
        isHost: true,
        players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
      });
    });

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on('joinRoom', (data, ack) => {
      data = data || {};
      if (currentRoom) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Already in a room' });
        return;
      }
      const room = getRoom(data.code);
      if (!room) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Room not found' });
        return;
      }
      if (room.players.length >= MAX_PLAYERS) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Room is full' });
        return;
      }
      const seat = findNextSeat(room);
      if (seat === -1) {
        if (typeof ack === 'function') ack({ ok: false, error: 'No seats available' });
        return;
      }
      room.players.push({ socketId: socket.id, seatIndex: seat, name: data.name || 'Player' });
      socket.join(room.code);
      currentRoom = room.code;

      // Tell the joining client they're in
      if (typeof ack === 'function') ack({
        ok: true,
        code: room.code,
        seatIndex: seat,
        isHost: false,
        players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
      });

      // Tell everyone else in the room a new player joined
      socket.to(room.code).emit('playerJoined', {
        seatIndex: seat,
        name: data.name || 'Player',
        players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
      });
    });

    // ── Find or Create Room (auto-matchmaking) ──────────────────────────────
    socket.on('findOrCreateRoom', (data, ack) => {
      data = data || {};
      // If already in a room, return current state (reconnect case)
      if (currentRoom) {
        const room = getRoom(currentRoom);
        if (room) {
          const player = room.players.find(p => p.socketId === socket.id);
          if (player) {
            if (typeof ack === 'function') ack({
              ok: true,
              code: room.code,
              seatIndex: player.seatIndex,
              isHost: room.hostId === socket.id,
              players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
            });
            return;
          }
        }
      }

      // Find a room with a vacant seat to auto-join
      for (const [code, room] of rooms) {
        if (room.players.length < MAX_PLAYERS) {
          const seat = findNextSeat(room);
          if (seat !== -1) {
            room.players.push({ socketId: socket.id, seatIndex: seat, name: data.name || 'Player' });
            socket.join(room.code);
            currentRoom = room.code;

            if (typeof ack === 'function') ack({
              ok: true,
              code: room.code,
              seatIndex: seat,
              isHost: false,
              players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
            });

            socket.to(room.code).emit('playerJoined', {
              seatIndex: seat,
              name: data.name || 'Player',
              players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
            });
            return;
          }
        }
      }

      // No vacant seat found — create a new room
      const room = createRoom();
      room.players.push({ socketId: socket.id, seatIndex: 0, name: data.name || 'Player' });
      room.hostId = socket.id;
      room.state = 'waiting';
      socket.join(room.code);
      currentRoom = room.code;

      if (typeof ack === 'function') ack({
        ok: true,
        code: room.code,
        seatIndex: 0,
        isHost: true,
        players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
      });
    });

    // ── Leave Room ───────────────────────────────────────────────────────────
    function leaveRoom() {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) { currentRoom = null; return; }

      const idx = room.players.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        const wasHost = room.hostId === socket.id;
        room.players.splice(idx, 1);

        if (room.players.length === 0) {
          // Last player left — destroy room
          rooms.delete(currentRoom);
          io.to(currentRoom).emit('roomClosed');
          currentRoom = null;
          return;
        }

        // Notify remaining players
        io.to(currentRoom).emit('playerLeft', {
          seatIndex: room.players[idx] ? room.players[idx].seatIndex : -1,
          players: room.players.map(p => ({ seatIndex: p.seatIndex, name: p.name })),
        });

        // If host left, assign new host (first player in list)
        if (wasHost) {
          room.hostId = room.players[0].socketId;
          io.to(room.hostId).emit('youAreHost');
        }
      }
      currentRoom = null;
    }

    socket.on('leaveRoom', leaveRoom);
    socket.on('disconnect', leaveRoom);

    // ── Player Action Relay ──────────────────────────────────────────────────
    socket.on('playerAction', (data) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;
      // Attach seat index and broadcast to everyone else in the room
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;
      data.seatIndex = player.seatIndex;
      socket.to(currentRoom).emit('remoteAction', data);
    });

    // ── Host State Broadcast ─────────────────────────────────────────────────
    // The host client periodically sends the full game state.
    // Server relays to all non-host clients in the room.
    let hostStateTimer = null;

    socket.on('hostState', (data) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      socket.to(currentRoom).emit('hostStateUpdate', data);
    });

    // ── Host Game Event ──────────────────────────────────────────────────────
    // The host client broadcasts discrete game events (spawn, death, payout)
    socket.on('hostEvent', (data) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      socket.to(currentRoom).emit('hostEvent', data);
    });
  });

  return io;
}

module.exports = { initSocket };
