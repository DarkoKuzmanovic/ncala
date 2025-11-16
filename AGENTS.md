# ncala - Agent Documentation

This document provides essential information for AI agents working with the ncala codebase - a real-time multiplayer Mancala game with invite code matchmaking.

## Project Overview

**ncala** is a real-time, invite-only Mancala game for the browser, built with:

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: PM2 with Nginx reverse proxy

## Essential Commands

### Development

```bash
# Start production server
npm run start

# Start development server with auto-reload
npm run dev

# Install dependencies
npm install

# Production install (no dev dependencies)
npm install --production
```

### Production Deployment

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# Update production server (automated)
./update.sh

# Start application manually
./start.sh
```

## Project Structure

```
ncala/
├── public/              # Client-side assets
│   ├── app.js           # Main game logic and Socket.IO client
│   ├── index.html       # Main HTML structure
│   └── styles.css       # Responsive CSS with dark/light themes
├── server/
│   └── index.js        # Express + Socket.IO server
├── .claude/             # Claude configuration
├── .crush/              # Crush tool configuration
├── .env.example          # Environment variables template
├── ecosystem.config.js   # PM2 configuration
├── package.json         # Dependencies and scripts
├── start.sh             # Application startup script
├── update.sh            # Production update script
└── AGENTS.md            # This file
```

## Key Configuration

### Environment Variables

Copy `.env.example` to `.env` to customize:

| Variable    | Description                              | Default |
| ----------- | ---------------------------------------- | ------- |
| `PORT`      | HTTP port for Express + Socket.IO server | `3000`  |
| `BASE_PATH` | Optional path prefix (e.g., `/ncala`)    | _empty_ |

### PM2 Configuration

- Managed via [`ecosystem.config.js`](ecosystem.config.js:1)
- Production environment settings
- Single instance mode

## Game Architecture

### Server-Side ([`server/index.js`](server/index.js:1))

- **Express**: Serves static files and health check endpoint
- **Socket.IO**: Real-time game state synchronization
- **Game Logic**: Full Mancala rules implementation including:
  - Stone distribution
  - Capture mechanics
  - Extra turns
  - Endgame scoring

### Client-Side ([`public/app.js`](public/app.js:1))

- **Board Management**: Dynamic board creation and updates
- **Socket Events**: Connection, game creation, joining, moves
- **UI State Management**: Real-time status updates and turn management

## Socket.IO Events

### Client → Server

- `game:create` - Create a new match with invite code
- `game:join` - Join existing match with invite code
- `game:move` - Make a move by selecting a pit

### Server → Client

- `state:update` - Broadcast game state to all players

## Development Patterns

### Game State Management

- Games stored in memory Map with invite codes as keys
- Each game tracks: board state, player sockets, current turn, game status

### Error Handling

- Comprehensive error messages for common scenarios
- Graceful handling of disconnections
- Automatic game cleanup

## Deployment Notes

### Nginx Configuration

When using `BASE_PATH`, configure Nginx to proxy:

- `BASE_PATH/` → static assets
- `BASE_PATH/socket.io/` → WebSocket traffic

### Health Checks

- Available at `/health` (and `BASE_PATH/health` if set)

### Port Management

- Use available port from app.quz.ma registry (e.g., `8001`)
- Set `PORT` environment variable accordingly

## Testing & Validation

### Health Check

```bash
curl http://localhost:3001/ncala/health
```

## Common Tasks for Agents

### Adding New Features

1. Update [`server/index.js`](server/index.js:1) for server logic
2. Update [`public/app.js`](public/app.js:1) for client logic
3. Update [`public/styles.css`](public/styles.css:1) for UI changes
4. Test with both development and production scripts

### Debugging

- Check PM2 logs: `pm2 logs ncala`
- Monitor health check endpoints
- Verify Socket.IO connections

### Code Patterns

- Server uses ES modules with 'use strict'
- Client uses vanilla JavaScript with modern ES6+ features
- Responsive CSS with CSS Grid and custom properties

## Gotchas & Important Notes

1. **BASE_PATH Support**: The application supports hosting under subdirectories
2. **Memory Storage**: Games are stored in memory (no persistence)
3. **Invite Codes**: 5-character alphanumeric (excluding ambiguous characters)
4. **Real-time Updates**: All game state changes broadcast immediately
5. **Mobile Optimization**: Fully responsive design with landscape mode support

## File Reference Guide

- **Main Server**: [`server/index.js`](server/index.js:1)
- **Client Logic**: [`public/app.js`](public/app.js:1)
- **UI Styling**: [`public/styles.css`](public/styles.css:1)
- **HTML Structure**: [`public/index.html`](public/index.html:1)
- **Startup**: [`start.sh`](start.sh:1)
- **Updates**: [`update.sh`](update.sh:1)
- **Dependencies**: [`package.json`](package.json:1)
- **PM2 Config**: [`ecosystem.config.js`](ecosystem.config.js:1)
- **Environment**: [`.env.example`](.env.example:1)

## Quick Start for New Agents

1. **Understand the game**: Review Mancala rules and current implementation
2. **Check configuration**: Verify environment variables and PM2 settings
3. **Test commands**: Run `npm run dev` to see the application in action
4. **Create a match**: Use the "Create match" button
5. **Join a match**: Use an invite code from another session
