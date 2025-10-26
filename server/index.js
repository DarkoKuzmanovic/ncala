'use strict';

const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { customAlphabet } = require('nanoid');

const PORT = process.env.PORT || 3000;
const INVITE_LENGTH = 5;
const generateInvite = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', INVITE_LENGTH);
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || '');
const STATIC_DIR = path.join(__dirname, '..', 'public');
const SOCKET_PATH = `${BASE_PATH || ''}/socket.io`.replace(/\/{2,}/g, '/');

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, { path: SOCKET_PATH });

if (BASE_PATH) {
  app.use(BASE_PATH, express.static(STATIC_DIR));
  app.get('/', (_req, res) => {
    res.redirect(BASE_PATH);
  });
} else {
  app.use(express.static(STATIC_DIR));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

if (BASE_PATH) {
  app.get(`${BASE_PATH}/health`, (_req, res) => {
    res.json({ ok: true });
  });
}

const games = new Map();

function normalizeBasePath(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  const withoutExtraSlashes = trimmed.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  return `/${withoutExtraSlashes}`;
}

function createInitialBoard() {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

function pitsFor(role) {
  return role === 'south'
    ? { pits: [0, 1, 2, 3, 4, 5], store: 6 }
    : { pits: [7, 8, 9, 10, 11, 12], store: 13 };
}

function belongsTo(role, pitIndex) {
  const { pits } = pitsFor(role);
  return pits.includes(pitIndex);
}

function nextPit(index) {
  return (index + 1) % 14;
}

function oppositePit(index) {
  return 12 - index;
}

function generateUniqueCode() {
  let code = generateInvite();
  while (games.has(code)) {
    code = generateInvite();
  }
  return code;
}

function createGame(socket) {
  const code = generateUniqueCode();
  const game = {
    code,
    board: createInitialBoard(),
    sockets: { south: socket, north: null },
    players: { [socket.id]: { role: 'south' } },
    currentTurn: 'south',
    status: 'waiting',
    lastMove: null,
    winner: null
  };

  socket.join(code);
  games.set(code, game);
  return game;
}

function joinGame(socket, code) {
  const upperCode = code.toUpperCase();
  const game = games.get(upperCode);

  if (!game) {
    throw new Error('not_found');
  }

  if (game.sockets.north) {
    throw new Error('full');
  }

  socket.join(upperCode);
  game.sockets.north = socket;
  game.players[socket.id] = { role: 'north' };
  game.status = 'active';

  return game;
}

function serializeGame(game, forSocketId) {
  return {
    code: game.code,
    board: game.board,
    status: game.status,
    currentTurn: game.currentTurn,
    playersReady: Boolean(game.sockets.south && game.sockets.north),
    youAre: game.players[forSocketId] ? game.players[forSocketId].role : null,
    lastMove: game.lastMove || null,
    winner: game.winner || null
  };
}

function broadcastGameState(game) {
  if (game.sockets.south) {
    game.sockets.south.emit('state:update', serializeGame(game, game.sockets.south.id));
  }
  if (game.sockets.north) {
    game.sockets.north.emit('state:update', serializeGame(game, game.sockets.north.id));
  }
}

function removeSocket(socket) {
  for (const game of games.values()) {
    if (game.players[socket.id]) {
      delete game.players[socket.id];

      if (game.sockets.south && game.sockets.south.id === socket.id) {
        game.sockets.south = null;
      }

      if (game.sockets.north && game.sockets.north.id === socket.id) {
        game.sockets.north = null;
      }

      game.status = 'abandoned';
      broadcastGameState(game);
      games.delete(game.code);
      break;
    }
  }
}

function handleMove(game, socketId, pitIndex) {
  const player = game.players[socketId];
  if (!player) {
    throw new Error('not_in_game');
  }

  if (game.status !== 'active') {
    throw new Error('not_active');
  }

  if (player.role !== game.currentTurn) {
    throw new Error('not_your_turn');
  }

  if (!belongsTo(player.role, pitIndex)) {
    throw new Error('invalid_pit');
  }

  if (game.board[pitIndex] === 0) {
    throw new Error('empty_pit');
  }

  const board = game.board;
  let stones = board[pitIndex];
  board[pitIndex] = 0;
  let index = pitIndex;
  const opponentStore = player.role === 'south' ? pitsFor('north').store : pitsFor('south').store;

  while (stones > 0) {
    index = nextPit(index);
    if (index === opponentStore) {
      continue;
    }
    board[index] += 1;
    stones -= 1;
  }

  const playerStore = pitsFor(player.role).store;
  const lastOwnPit = belongsTo(player.role, index);

  if (lastOwnPit && board[index] === 1 && index !== playerStore) {
    const capturedIndex = oppositePit(index);
    const captured = board[capturedIndex];
    if (captured > 0) {
      board[playerStore] += captured + 1;
      board[index] = 0;
      board[capturedIndex] = 0;
    }
  }

  if (index !== playerStore) {
    game.currentTurn = player.role === 'south' ? 'north' : 'south';
  }

  game.lastMove = {
    player: player.role,
    pit: pitIndex,
    endedAt: index
  };

  finalizeIfGameOver(game);
}

function finalizeIfGameOver(game) {
  const southSide = pitsFor('south').pits;
  const northSide = pitsFor('north').pits;
  const southEmpty = southSide.every((index) => game.board[index] === 0);
  const northEmpty = northSide.every((index) => game.board[index] === 0);

  if (!southEmpty && !northEmpty) {
    return;
  }

  if (southEmpty) {
    const remainder = northSide.reduce((sum, index) => sum + game.board[index], 0);
    game.board[pitsFor('north').store] += remainder;
    northSide.forEach((index) => {
      game.board[index] = 0;
    });
  }

  if (northEmpty) {
    const remainder = southSide.reduce((sum, index) => sum + game.board[index], 0);
    game.board[pitsFor('south').store] += remainder;
    southSide.forEach((index) => {
      game.board[index] = 0;
    });
  }

  const southScore = game.board[pitsFor('south').store];
  const northScore = game.board[pitsFor('north').store];

  if (southScore > northScore) {
    game.winner = 'south';
  } else if (northScore > southScore) {
    game.winner = 'north';
  } else {
    game.winner = 'draw';
  }

  game.status = 'finished';
}

io.on('connection', (socket) => {
  socket.on('game:create', (ack) => {
    removeSocket(socket);
    const game = createGame(socket);
    if (typeof ack === 'function') {
      ack({ ok: true, state: serializeGame(game, socket.id) });
    }
    broadcastGameState(game);
  });

  socket.on('game:join', (payload, ack) => {
    try {
      const { code } = payload || {};
      if (!code) {
        throw new Error('missing_code');
      }

      removeSocket(socket);
      const game = joinGame(socket, code);
      if (typeof ack === 'function') {
        ack({ ok: true, state: serializeGame(game, socket.id) });
      }

      broadcastGameState(game);
    } catch (error) {
      if (typeof ack === 'function') {
        ack({ ok: false, reason: error.message });
      }
    }
  });

  socket.on('game:move', (payload, ack) => {
    try {
      const { code, pit } = payload || {};
      if (!code || typeof pit !== 'number') {
        throw new Error('invalid_payload');
      }
      const game = games.get(code.toUpperCase());
      if (!game) {
        throw new Error('not_found');
      }

      handleMove(game, socket.id, pit);

      broadcastGameState(game);

      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    } catch (error) {
      if (typeof ack === 'function') {
        ack({ ok: false, reason: error.message });
      }
    }
  });

  socket.on('disconnect', () => {
    removeSocket(socket);
  });
});

httpServer.listen(PORT, () => {
  const pathInfo = BASE_PATH || '/';
  // eslint-disable-next-line no-console
  console.log(`ncala server listening on http://localhost:${PORT}${pathInfo}`);
  // eslint-disable-next-line no-console
  console.log(`socket.io path set to ${SOCKET_PATH}`);
});
