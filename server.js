const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });
const path = require('path');

const PORT = process.env.PORT || 3000;

// Указываем серверу отдавать наш index.html
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Логика совместного рисования в реальном времени
io.on('connection', (socket) => {
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });
    socket.on('clear', () => {
        socket.broadcast.emit('clear');
    });
});

// 🔥 ТА САМАЯ ХИТРОСТЬ (ЗАЩИТА ОТ ЗАСЫПАНИЯ СЕРВЕРА)
const https = require('https');
setInterval(() => {
    // Хостинг Render сам подставит сюда адрес вашего сайта
    const url = process.env.RENDER_EXTERNAL_URL;
    if (url) {
        https.get(url, (res) => {
            console.log('Пользователь "виртуально" зашел на сайт. Сервер активен!');
        }).on('error', (e) => {
            console.error('Ошибка само-пинга:', e.message);
        });
    }
}, 600000); // Повторяем проверку каждые 10 минут

http.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
