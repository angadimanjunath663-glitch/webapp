const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const ext = path.extname(filePath);
  const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/html';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    const room = msg.room;

    if (!rooms[room]) rooms[room] = [];

    if (msg.type === 'join') {
      rooms[room].push(ws);
      if (rooms[room].length === 2) {
        rooms[room][0].send(JSON.stringify({ type: 'start' }));
      }
    } else {
      rooms[room].forEach(peer => {
        if (peer !== ws && peer.readyState === 1) {
          peer.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on('close', () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(p => p !== ws);
    }
  });
});

server.listen(3000, () => console.log('Server running at http://localhost:3000'));
