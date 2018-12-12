var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var httpskeys = require('./config/httpskeys');
var https = require('https');
var fs = require('mz/fs');
var passport = require('passport');
var twitterStrategy = require('passport-twitter').Strategy;
var twitterConfig = require('./config/twitter');
var secrets = require('./config/secrets');
var mongo = require('mongodb').MongoClient;
var url = require('./config/database').url;

// https keys
var key = fs.readFileSync(httpskeys.key);
var cert = fs.readFileSync(httpskeys.cert);
var port = 80;
var secport = 443;

// routes
var index = require('./routes/index');
var api = require('./routes/api');
var googleDirectionSearch = require('./routes/googleDirectionSearch');

// passport twitter
passport.use(new twitterStrategy({
    consumerKey: twitterConfig.twitterKey,
    consumerSecret: twitterConfig.twitterSecret,
    callbackURL: twitterConfig.twitterCallback,
    userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
    proxy: false
  },
  function(token, tokenSecret, profile, cb) {
    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// app initialization
var app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// bodyParser MiddleWare
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// express-session
app.use(require('express-session')({
  secret: secrets.sessionSecret,
  resave: true,
  saveUninitialized: true
}));

// initialize Passport and restore state from session if exists
app.use(passport.initialize());
app.use(passport.session({
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 3600000
  }
}));

// routes
app.use('/', index);
app.use('/api', api);
app.post('/googleDirectionSearch', googleDirectionSearch);

// twitter OAuth mess
app.get('/login/twitter', passport.authenticate('twitter'));
app.get('/login/twitter/callback',
  passport.authenticate('twitter', {
    failureRedirect: '/'
  }),
  function(req, res) {
    // database record
    mongo.connect(url, {
      useNewUrlParser: true
    }, function(err, client) {
      if (err) throw err;
      var db = client.db("beantracker");
      var userEmail;
      if (req.user.hasOwnProperty('emails')) {
        userEmail = req.user.emails[0].value;
      } else {
        userEmail = null;
      };
      db.collection("twitter").updateOne({
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
        email: userEmail
      }, {
        $set: {
          lastLogin: new Date().toISOString()
        }
      }, {
        upsert: true
      }, function(err, res) {
        if (err) throw err;
        client.close();
      });
    });
    // end of database block
    res.redirect('/yay');
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

// https server
const httpsServer = https.createServer({
  key: key,
  cert: cert
}, app).listen(secport, function() {
  console.log('Secure magic happening on port ' + secport);
});

// http redirect server
const http = require('http');
const httpApp = express();
httpApp.get('*', function(req, res) {
  res.redirect('https://' + req.headers.host + req.url);
})
const httpServer = http.createServer(httpApp).listen(port, function() {
  console.log('Magic happening on port ' + port);
});
