const mongoose = require('mongoose');
const crypto = require('crypto');
const uri = require('./secret_data.js');

var messageSchema = new mongoose.Schema({
    senderID: {
        type: String,
    },
    senderName: {
        type: String,
    },
    receiverID: {
        type: String,
    },
    receiverName: {
        type: String,
    },
    message: {
        type: String,
    },
    time: {
        type: Number,
    }
});


messageSchema.methods.encryptMessage = function (message) {
    var key = crypto.createCipher('aes-128-cbc', uri.messageSecret);
    var str = key.update(message, 'utf8', 'base64')
    str += key.final('base64');
    this.message = str;
};

messageSchema.methods.decryptMessage = function (message) {
    var key = crypto.createDecipher('aes-128-cbc', uri.messageSecret);
    var str = key.update(message, 'base64', 'utf8')
    str += key.final('utf8');
    return str;
};

mongoose.model('Message', messageSchema);