const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Kết nối MongoDB
mongoose.connect('mongodb://localhost/chat-app', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nickname: { type: String },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Danh sách bạn bè
});

const User = mongoose.model('User', userSchema);

// Route đăng ký
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/chat');
});

// Route đăng nhập
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/chat');
    } else {
        res.redirect('/');
    }
});

// Route chat
app.get('/chat', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    const user = await User.findById(req.session.userId).populate('friends');
    res.sendFile(__dirname + '/public/chat.html');
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('sendMessage', (message) => {
        io.emit('newMessage', message);
    });
});

// Khởi động server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});