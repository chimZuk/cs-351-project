const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
const io = require('socket.io')(https);
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const jwt = require('express-jwt');
const uri = require('./models/secret_data.js');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/chat.chimzuk.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/chat.chimzuk.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/chat.chimzuk.com/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};

require('./models/db');
require('./config/passport');

const User = mongoose.model('User');
const Message = mongoose.model('Message');

const auth = jwt({
    secret: uri.secret,
    userProperty: 'payload'
});

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
        io.emit('chat_message', message);
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
                token: token,
                user: user
            });
        } else {
            res.status(401).json(info);
        }
    })(req, res);
});

app.post('/api/messages.get', auth, function (req, res) {
    if (!req.payload._id) {
        res.status(401).json({ message: "Auth Error: User is not authorized." });
    } else {
        User.findById(req.payload._id).exec(function (err, user) {
            if (user != null) {
                let data = {
                    messages: [],
                    users: [],
                    chats: []
                }
                User.find({}).exec(function (err, users) {
                    data.users = users;

                    Message.find({ $or: [{ 'receiverID': req.payload._id }, { 'senderID': req.payload._id }] }).exec(function (err, messages) {
                        data.messages = messages.map(item => {
                            item.message = item.decryptMessage(item.message)
                            return item;
                        });

                        data.messages = data.messages.sort((x, y) => {
                            if (x.time < y.time) {
                                return -1;
                            }
                            if (x.time > y.time) {
                                return 1;
                            }
                            return 0;
                        });

                        for (var i = 0; i < data.users.length; i++) {
                            if (users[i]._id != req.payload._id) {
                                let chat = {
                                    name: data.users[i].username,
                                    userData: {
                                        _id: data.users[i]._id,
                                        username: data.users[i].username
                                    },
                                    messages: data.messages.filter(item => {
                                        return (item.senderID == data.users[i]._id && item.receiverID == req.payload._id) || (item.receiverID == data.users[i]._id && item.senderID == req.payload._id)
                                    }).sort((x, y) => {
                                        if (x.time < y.time) {
                                            return -1;
                                        }
                                        if (x.time > y.time) {
                                            return 1;
                                        }
                                        return 0;
                                    })
                                }
                                data.chats.push(chat);
                            }
                        }

                        res.status(200).json(data);
                    });

                })

            } else {
                res.status(401).json({ message: "Auth Error: User is not found." })
            }
        });
    }
});

app.post('/api/message.send', auth, function (req, res) {
    if (!req.payload._id) {
        res.status(401).json({ message: "Auth Error: User is not authorized." });
    } else {
        User.findById(req.payload._id).exec(function (err, user) {
            if (user != null) {
                var message = new Message();

                message.senderID = req.payload._id;
                message.senderName = user.username;
                message.receiverID = req.body.receiverID;
                message.receiverName = req.body.receiverName;
                message.time = req.body.time;
                message.encryptMessage(req.body.message);

                message.save(function (err) {
                    res.status(200);
                    res.json({
                        "message": message
                    });
                });
            } else {
                res.status(401).json({ message: "Auth Error: User is not found." })
            }
        });
    }
});

const redirection = express();

redirection.get('*', function (req, res) {
    res.redirect('https://' + req.headers.host + req.url);
});

const httpServer = http.createServer(redirection);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(8099, () => {
    console.log('HTTP Server running on port 8099');
});

httpsServer.listen(8009, () => {
    console.log('HTTPS Server running on port 8009');
});