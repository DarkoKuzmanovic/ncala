function detectBasePath() {
  const script = document.querySelector('script[data-socket]');
  if (!script) {
    return '';
  }

  try {
    const srcPath = new URL(script.src, window.location.href).pathname;
    const trimmed = srcPath.replace(/\/socket\.io\/socket\.io\.js$/, '');
    if (trimmed === '/' || trimmed === '') {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
}

const basePath = detectBasePath();

function socketPathFrom(base) {
  if (!base) {
    return '/socket.io';
  }
  return `${base.replace(/\/$/, '')}/socket.io`;
}

const socket = io({ path: socketPathFrom(basePath) });

const boardLayout = [
  { index: 13, type: 'store', role: 'north', row: '1 / span 2', column: '1' },
  { index: 12, type: 'pit', role: 'north', row: '1', column: '2' },
  { index: 11, type: 'pit', role: 'north', row: '1', column: '3' },
  { index: 10, type: 'pit', role: 'north', row: '1', column: '4' },
  { index: 9, type: 'pit', role: 'north', row: '1', column: '5' },
  { index: 8, type: 'pit', role: 'north', row: '1', column: '6' },
  { index: 7, type: 'pit', role: 'north', row: '1', column: '7' },
  { index: 6, type: 'store', role: 'south', row: '1 / span 2', column: '8' },
  { index: 0, type: 'pit', role: 'south', row: '2', column: '2' },
  { index: 1, type: 'pit', role: 'south', row: '2', column: '3' },
  { index: 2, type: 'pit', role: 'south', row: '2', column: '4' },
  { index: 3, type: 'pit', role: 'south', row: '2', column: '5' },
  { index: 4, type: 'pit', role: 'south', row: '2', column: '6' },
  { index: 5, type: 'pit', role: 'south', row: '2', column: '7' }
];

const selectors = {
  board: document.getElementById('board'),
  code: document.getElementById('code-display'),
  role: document.getElementById('role-display'),
  state: document.getElementById('state-display'),
  turn: document.getElementById('turn-display'),
  message: document.getElementById('message'),
  createButton: document.getElementById('create-btn'),
  joinForm: document.getElementById('join-form'),
  joinInput: document.getElementById('join-code'),
  actions: document.querySelector('.actions'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.querySelector('.theme-icon')
};

const cellMap = new Map();

const gameState = {
  code: null,
  youAre: null,
  board: Array(14).fill(0),
  status: 'idle',
  currentTurn: null,
  playersReady: false,
  winner: null,
  lastMove: null
};

const errorMessages = {
  not_found: 'No match exists with that invite code.',
  full: 'That match already has two players.',
  not_active: 'The match is not active right now.',
  not_your_turn: 'Hold on—wait for your turn.',
  invalid_pit: 'Choose one of your own pits.',
  empty_pit: 'That pit is empty.',
  missing_code: 'Enter an invite code first.',
  invalid_payload: 'Something went wrong with your move. Try again.',
  not_in_game: 'Join a match before making a move.'
};

function buildBoard() {
  boardLayout.forEach((cell) => {
    const element =
      cell.type === 'pit' ? document.createElement('button') : document.createElement('div');
    element.className = `cell cell--${cell.type} cell--${cell.role}`;
    element.dataset.index = String(cell.index);
    element.style.gridColumn = cell.column;
    element.style.gridRow = cell.row;

    if (cell.type === 'pit') {
      element.type = 'button';
      element.addEventListener('click', () => handlePitClick(cell.index));
    }

    const label = document.createElement('span');
    label.className = 'cell-label';
    const roleLabel = cell.role === 'south' ? 'South' : 'North';
    label.textContent = cell.type === 'store' ? `${roleLabel} store` : `${roleLabel} pit`;

    const count = document.createElement('span');
    count.className = 'cell-count';
    count.textContent = '0';

    element.appendChild(count);
    element.appendChild(label);

    selectors.board.appendChild(element);
    cellMap.set(cell.index, { element, count });
  });
}

function labelForRole(role) {
  if (role === 'south') {
    return 'South (bottom)';
  }
  if (role === 'north') {
    return 'North (top)';
  }
  return 'Spectator';
}

function formatStatus(state) {
  switch (state.status) {
    case 'waiting':
      return 'Waiting for opponent';
    case 'active':
      return 'Live';
    case 'finished':
      return 'Finished';
    case 'abandoned':
      return 'Abandoned';
    default:
      return 'Idle';
  }
}

function formatTurn(state) {
  if (state.status === 'finished') {
    if (state.winner === 'draw') {
      return 'Draw';
    }
    if (state.winner) {
      return `${state.winner === 'south' ? 'South' : 'North'} wins`;
    }
  }

  if (state.status !== 'active') {
    return '—';
  }

  return state.currentTurn === 'south' ? 'South to play' : 'North to play';
}

function setMessage(text) {
  selectors.message.textContent = text;
}

function applyServerState(payload) {
  if (!payload) {
    return;
  }

  gameState.code = payload.code || gameState.code;
  gameState.youAre = payload.youAre;
  gameState.board = payload.board ? payload.board.slice() : gameState.board;
  gameState.status = payload.status || gameState.status;
  gameState.currentTurn = payload.currentTurn;
  gameState.playersReady = Boolean(payload.playersReady);
  gameState.winner = payload.winner || null;
  gameState.lastMove = payload.lastMove || null;

  refreshUI();
}

function updateActionsVisibility() {
  const isGameInProgress = gameState.status === 'active' || gameState.status === 'waiting';
  selectors.actions.style.display = isGameInProgress ? 'none' : 'flex';
}

function refreshUI() {
  selectors.code.textContent = gameState.code || '—';
  selectors.role.textContent = labelForRole(gameState.youAre);
  selectors.state.textContent = formatStatus(gameState);
  selectors.turn.textContent = formatTurn(gameState);

  refreshBoard();
  updateMessageForState();
  updateActionsVisibility();
}

function refreshBoard() {
  const actionable =
    gameState.status === 'active' && gameState.youAre && gameState.youAre === gameState.currentTurn;

  boardLayout.forEach((cell) => {
    const ref = cellMap.get(cell.index);
    if (!ref) {
      return;
    }

    const { element, count } = ref;
    const stones = gameState.board[cell.index] ?? 0;
    count.textContent = String(stones);
    element.classList.toggle('is-turn', cell.type === 'pit' && gameState.currentTurn === cell.role);
    element.classList.toggle(
      'is-last',
      Boolean(
        gameState.lastMove &&
          (gameState.lastMove.pit === cell.index || gameState.lastMove.endedAt === cell.index)
      )
    );

    if (cell.type === 'pit') {
      const isPlayable = actionable && cell.role === gameState.youAre && stones > 0;
      element.disabled = !isPlayable;
      element.classList.toggle('is-actionable', isPlayable);
      element.setAttribute('aria-disabled', String(!isPlayable));
    }
  });
}

function updateMessageForState() {
  if (gameState.status === 'waiting') {
    if (gameState.youAre === 'south') {
      setMessage('Share your invite code with a friend to start the duel.');
    } else {
      setMessage('Waiting for host to begin.');
    }
    return;
  }

  if (gameState.status === 'active') {
    if (gameState.youAre) {
      setMessage(
        gameState.currentTurn === gameState.youAre
          ? 'It is your move. Pick a pit.'
          : 'Opponent is thinking...'
      );
    } else {
      setMessage('Match in progress. Sit back and watch.');
    }
    return;
  }

  if (gameState.status === 'finished') {
    if (gameState.winner === 'draw') {
      setMessage('Game over — it is a draw.');
    } else if (gameState.winner === gameState.youAre) {
      setMessage('Victory! You captured more stones.');
    } else if (gameState.winner) {
      setMessage('Defeat. Better luck next time.');
    } else {
      setMessage('Game over.');
    }
    return;
  }

  if (gameState.status === 'abandoned') {
    setMessage('The match ended because a player disconnected.');
    return;
  }

  setMessage('Welcome! Create or join a duel with an invite code.');
}

function handlePitClick(pitIndex) {
  if (!gameState.code) {
    return;
  }

  socket.emit('game:move', { code: gameState.code, pit: pitIndex }, (response) => {
    if (!response || response.ok) {
      return;
    }

    const message = errorMessages[response.reason] || 'Move rejected.';
    setMessage(message);
  });
}

function handleCreate() {
  selectors.createButton.disabled = true;
  setMessage('Creating a new match...');

  socket.emit('game:create', (response) => {
    selectors.createButton.disabled = false;
    if (!response || !response.ok) {
      setMessage('Unable to create a match right now.');
      return;
    }

    applyServerState(response.state);
    setMessage('Match created. Share your invite code with a friend!');
  });
}

function handleJoin(event) {
  event.preventDefault();
  const rawCode = selectors.joinInput.value.trim().toUpperCase();
  selectors.joinInput.value = rawCode;

  if (!rawCode) {
    setMessage('Enter an invite code to join.');
    return;
  }

  socket.emit('game:join', { code: rawCode }, (response) => {
    if (!response || !response.ok) {
      const reason = response?.reason;
      const message = reason ? errorMessages[reason] || 'Unable to join match.' : 'Unable to join.';
      setMessage(message);
      return;
    }

    applyServerState(response.state);
    setMessage('You joined the match. Good luck!');
  });
}

selectors.createButton.addEventListener('click', handleCreate);
selectors.joinForm.addEventListener('submit', handleJoin);

socket.on('state:update', (payload) => {
  applyServerState(payload);
});

socket.on('connect', () => {
  setMessage('Connected. Create or join a duel to get started.');
});

socket.on('disconnect', () => {
  setMessage('Connection lost. Waiting to reconnect...');
});

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  setTheme(theme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  if (selectors.themeIcon) {
    selectors.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

if (selectors.themeToggle) {
  selectors.themeToggle.addEventListener('click', toggleTheme);
}

initializeTheme();
buildBoard();
refreshUI();
