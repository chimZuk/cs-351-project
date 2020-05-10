const mongoose = require('mongoose');
const uri = require('../models/secret_data.js');

mongoose.connect(uri.uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('connected', function () {
    console.log('Mongoose connected to ' + uri.uri);
});
mongoose.connection.on('error', function (err) {
    console.log('Mongoose connection error: ' + err);
});
mongoose.connection.on('disconnected', function () {
    console.log('Mongoose disconnected');
});

require('./User');