var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var url = require('../config/database').url;

router.get('/', function(req, res) {
  res.render('indexMap.html');
});

router.get('/yay', require('connect-ensure-login').ensureLoggedIn('/login/twitter'),
  function(req, res) {
    var fav;
    mongo.connect(url, {
      useNewUrlParser: true
    }, function(err, client) {
      if (err) throw err;
      var db = client.db("beantracker");
      db.collection("twitter").findOne({
        id: req.user.id
      }, function(err, resp) {
        if (err) throw err;
        client.close();
        var fav;
        if (resp.favorite === undefined) {
          fav = [];
        } else {
          fav = resp.favorite;
        }
        res.render('indexMap.ejs', {
          user: req.user,
          fav: fav
        });
      });
    });
  });

module.exports = router;
