var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

passport.use(new LocalStrategy({
    usernameField: 'username'
}, function (username, password, callback) {

    User.findOne({ username: username }, function (err, user) {
        if (err) {
            return callback(err);
        }

        if (!user) {
            return callback(null, false, {
                message: 'Auth Error: Incorrect credentials.'
            });
        }

        if (!user.validPassword(password)) {
            return callback(null, false, {
                message: 'Auth Error: Incorrect credentials.'
            });
        }

        return callback(null, user);
    });

}));