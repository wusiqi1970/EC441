var express = require('express');
var router = express.Router();
var secrets = require('../config/secrets');
var request = require('request');

router.get('/buShuttle', function(req, res, next) {
  request({
    url: secrets.buShuttles,
    json: true
  }, function(err, resp, body) {
    if (!err && resp.statusCode === 200) {
      results = body;
      res.send(results);
    };
  });
});

router.get('/', function(req, res, next) {
  res.send('testing');
});

module.exports = router;
