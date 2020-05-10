const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');

require('./models/db');
require('./config/passport');

const User = mongoose.model('User');

app.use('/', express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile('index.html');
});
app.get('*', (req, res) => {
    res.redirect('/');
});

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');
    next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

io.sockets.on('connection', function (socket) {
    socket.on('username', function (username) {
        socket.username = username;
        io.emit('is_online', '🔵 <i>' + socket.username + ' join the chat..</i>');
    });

    socket.on('disconnect', function (username) {
        io.emit('is_online', '🔴 <i>' + socket.username + ' left the chat..</i>');
    })

    socket.on('chat_message', function (message) {
        io.emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message);
    });

});

app.post('/api/register', function (req, res) {
    var user = new User();

    user.username = req.body.username;
    user.setPassword(req.body.password);
    user.save(function (err) {
        var token = user.generateJwt();
        res.status(200);
        res.json({
            "token": token
        });
    });

});

app.post('/api/login', function (req, res) {
    passport.authenticate('local', function (err, user, info) {
        var token;

        if (err) {
            res.status(404).json(err);
            return;
        }

        if (user) {
            token = user.generateJwt();
            res.status(200);
            res.json({
                "token": token
            });
        } else {
            res.status(401).json(info);
        }
    })(req, res);
});

http.listen(8080, function () {
    console.log('Listening on *:8080');
});