# Adaptive Vector-Based Collaboration for Low Bandwidth Remote Learning

A full-stack React + Node collaboration scaffold focused on vector-only whiteboarding, PDF sharing, bandwidth-aware audio, and live transcription.

## Structure

- `client/` - React + Vite frontend
- `server/` - Node.js + Express + Socket.IO backend

## Setup

```bash
cd adaptive-collab/server
npm install
npm run dev

cd ../client
npm install
npm run dev
```

## Environment

Create these files:

`server/.env`

```env
PORT=4000
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

`client/.env`

```env
VITE_SERVER_URL=http://localhost:4000
```
