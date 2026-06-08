const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Хранилище пользователей в комнатах
const rooms = {};

io.on('connection', (socket) => {
    // Пользователь заходит в комнату
    socket.on('join-room', ({ room, name, color }) => {
        socket.join(room);
        socket.room = room;
        
        if (!rooms[room]) rooms[room] = {};
        rooms[room][socket.id] = { name, color, x: 0, y: 0 };

        // Сообщаем всем в комнате о новом участнике
        io.to(room).emit('update-users', rooms[room]);
    });

    // Передача движения мыши/курсора
    socket.on('mouse-move', (data) => {
        if (socket.room && rooms[socket.room] && rooms[socket.room][socket.id]) {
            rooms[socket.room][socket.id].x = data.x;
            rooms[socket.room][socket.id].y = data.y;
            socket.broadcast.to(socket.room).emit('mouse-move', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });

    // Передача линий рисования
    socket.on('draw', (data) => {
        if (socket.room) {
            socket.broadcast.to(socket.room).emit('draw', data);
        }
    });

    // Команда очистки доски
    socket.on('clear', () => {
        if (socket.room) {
            socket.broadcast.to(socket.room).emit('clear');
        }
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        if (socket.room && rooms[socket.room] && rooms[socket.room][socket.id]) {
            delete rooms[socket.room][socket.id];
            io.to(socket.room).emit('update-users', rooms[socket.room]);
            if (Object.keys(rooms[socket.room]).length === 0) {
                delete rooms[socket.room];
            }
        }
    });
});

// Само-пинг против засыпания
const https = require('https');
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (url) {
        https.get(url, () => { console.log('Пинг выполнен'); }).on('error', (e) => {});
    }
}, 600000);

http.listen(PORT, () => { console.log(`Сервер на порту ${PORT}`); });
