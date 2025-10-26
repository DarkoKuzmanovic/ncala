# ncala

Real-time, invite-only Mancala for the browser. Built with Node.js, vanilla JavaScript, and Socket.IO.

## Features

- Two-player Mancala with accurate rules (capture, extra turns, endgame scoring)
- Invite code matchmaking (share a short code to bring a friend into the lobby)
- Live board updates over WebSockets
- Elegant responsive UI that works nicely on desktop and mobile
- Optional `BASE_PATH` support for hosting the app under a subdirectory (e.g. `/ncala`)

## Getting Started

```bash
git clone <repo-url> ncala
cd ncala
npm install
npm run start
```

Open `http://localhost:3000` in your browser. The first player clicks **Create match** and shares the invite code. The second player joins with **Join**.

### Scripts

- `npm run start` – start the production server
- `npm run dev` – start the server with `nodemon` for live reload

## Configuration

Copy `.env.example` to `.env` if you need to customise settings.

| Variable   | Description                                                       | Default |
| ---------- | ----------------------------------------------------------------- | ------- |
| `PORT`     | HTTP port for the Express + Socket.IO server                      | `3000`  |
| `BASE_PATH`| Optional path prefix (including leading slash) such as `/ncala`   | _empty_ |

When `BASE_PATH` is set, the server serves static assets and the Socket.IO endpoint from that path, which is useful when reverse-proxying behind `https://app.quz.ma/ncala/`.

## Deployment Notes

1. Pick an available port from the app.quz.ma registry (e.g. `8001`) and set `PORT` accordingly.
2. Install dependencies: `npm install --production`.
3. Start with PM2 using `ecosystem.config.js`:

   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

4. Configure Nginx to proxy `/ncala/` (or your chosen path) to `http://127.0.0.1:PORT/`. Make sure to proxy `/ncala/socket.io/` as well for WebSocket traffic.
5. Health check is available at `http://127.0.0.1:PORT/health` (and `/ncala/health` if `BASE_PATH` is set).

## Project Structure

```
ncala/
├── public/              # Client-side assets
├── server/              # Express + Socket.IO server
├── .env.example
├── ecosystem.config.js
├── package.json
├── start.sh
└── README.md
```

## Roadmap Ideas

- Add spectator mode and chat
- Persist matches for rematches / historical stats
- Add accessibility improvements for screen readers (audio cues, ARIA updates)

PRs and suggestions are always welcome!
