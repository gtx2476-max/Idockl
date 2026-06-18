const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

const PORT = process.env.PORT || 3000;

// Раздаем статические файлы (наш index.html)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Логика комнат и синхронизации для 2D и 3D пространства
const rooms = {};

io.on('connection', (socket) => {
    // Вход в комнату (Party)
    socket.on('join-room', ({ room, name, color }) => {
        socket.join(room);
        socket.room = room;
        
        if (!rooms[room]) rooms[room] = {};
        rooms[room][socket.id] = { name, color, x: 0, y: 0 };

        io.to(room).emit('update-users', rooms[room]);
    });

    // Движение курсоров-карандашей участников
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

    // Трансляция рисования и добавления 3D объектов по сети
    socket.on('draw', (data) => {
        if (socket.room) {
            socket.broadcast.to(socket.room).emit('draw', data);
        }
    });

    // Команда полной очистки доски
    socket.on('clear', () => {
        if (socket.room) {
            socket.broadcast.to(socket.room).emit('clear');
        }
    });

    // Отключение пользователя от сессии
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

// 👻 ФАНТОМНЫЙ ЧЕЛИК (ЗАЩИТА ОТ ЗАСЫПАНИЯ НА RENDER)
const https = require('https');
setInterval(() => {
    // Render автоматически прописывает адрес твоего сайта в эту переменную
    const url = process.env.RENDER_EXTERNAL_URL;
    if (url) {
        https.get(url, (res) => {
            console.log('Фантомный челик зашел на доску. Сервер активен 24/7!');
        }).on('error', (e) => {
            console.error('Ошибка пинга сервера:', e.message);
        });
    }
}, 600000); // Повторяем заход каждые 10 минут

http.listen(PORT, () => {
    console.log(`Сервер iDock успешно запущен на порту ${PORT}`);
});
