var express = require('express');
var router = express.Router();
var request = require('request');
var google = require('../config/google');
var mongo = require('mongodb').MongoClient;
var url = require('../config/database').url;

const {
  body,
  validationResult
} = require('express-validator/check');
const {
  sanitizeBody
} = require('express-validator/filter');
var searchWhitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 1234567890,';

process.on('uncaughtException', function(err) {
  console.error(err);
  console.log("Node NOT Exiting...");
});

router.post('/googleDirectionSearch', [
  body('origin').trim().whitelist(searchWhitelist),
  body('destination').trim().whitelist(searchWhitelist),
], (req, res, next) => {
  var origin = req.body.origin;
  var rememberOri = req.body.rememberOri;
  var destination = req.body.destination;
  var rememberDest = req.body.rememberDest;
  var userID = req.user.id;
  if (rememberOri == "on" || rememberDest == "on") {
    mongo.connect(url, {
      useNewUrlParser: true
    }, function(err, client) {
      if (err) throw err;
      var db = client.db("beantracker");
      if (rememberOri == "on") {
        db.collection("twitter").updateOne({
          id: userID
        }, {
          $addToSet: {
            favorite: origin
          }
        }, {
          upsert: true
        }, function(err, res) {
          if (err) throw err;
          client.close();
        });
        // end of if
      };
      if (rememberDest == "on") {
        db.collection("twitter").updateOne({
          id: userID
        }, {
          $addToSet: {
            favorite: destination
          }
        }, {
          upsert: true
        }, function(err, res) {
          if (err) throw err;
          client.close();
        });
        // end of if
      };
    });
  }
  // temp variable for the search
  var options_walk = {
    method: 'GET',
    url: 'https://maps.googleapis.com/maps/api/directions/json',
    qs: {
      key: google.googleAPIkey,
      origin: origin,
      destination: destination,
      mode: 'walking'
    },
    headers: {
      'cache-control': 'no-cache'
    }
  };
  var options_transit = {
    method: 'GET',
    url: 'https://maps.googleapis.com/maps/api/directions/json',
    qs: {
      key: google.googleAPIkey,
      origin: origin,
      destination: destination,
      mode: 'transit'
    },
    headers: {
      'cache-control': 'no-cache'
    }
  };

  // make the request
  request(options_walk, function(error, response, body) {
    if (error) throw new Error(error);
    request(options_transit, function(error2, response2, body2) {
      if (error) throw new Error(error2);
      var obj = JSON.parse(body);
      var obj2 = JSON.parse(body2);
      var results;
      if (obj.routes[0] !== undefined) {
        results = origin + ' and ' + destination + ' is ' + obj.routes[0].legs[0].distance.text + " away on foot. It takes " + obj.routes[0].legs[0].duration.text + " to walk there, or " + obj2.routes[0].legs[0].duration.text + " if you take the T.";
      } else {
        results = 'No routes found between specified locations';
      };
      res.send(results);
    });
  });

});

module.exports = router;
