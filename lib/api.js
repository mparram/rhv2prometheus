const bodyParser = require('body-parser');
var db = require("./db");
var express = require('express');
var router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json({ type: 'application/*+json', inflate: true }));

router.get('/', function(req, res) {
    response = {
     message: 'RHV2Prometheus API'
    };
    res.send(response);
});
if (process.env.scaleEnable === "true"){  
  var Client = require('3scale').Client;
  client = new Client({host: "3scale-admin.apps.hackathon.rhmi.io", port: 443});
  router.get('/metrics', function(req, res) {
      client.authrep_with_user_key({ service_token: "xdRrqgsj9x8P0pka4Zr4Erp6nrqfQcAz", service_id: "API", user_key: "29b116a7287bec83fe892da977a92d81", usage: { "hits": 1 } }, function(response){
          if(response.is_success()) {
            } else {
              throw new Error("not authorized " + response.error_message);
            }
      });
      db.readAllMetrics(res);
  });
  router.get('/metrics/:metric', function(req, res) {
    client.authrep_with_user_key({ service_token: "xdRrqgsj9x8P0pka4Zr4Erp6nrqfQcAz", service_id: "API", user_key: "29b116a7287bec83fe892da977a92d81", usage: { "hits": 1 } }, function(response){
      if(response.is_success()) {
      } else {
        throw new Error("not authorized " + response.error_message);
      }
    });
      db.readMetric(res,req.params.metric);
  });
}else{
  router.get('/metrics', function(req, res) {
    db.readAllMetrics(res);
  });
  router.get('/metrics/:metric', function(req, res) {
    db.readMetric(res,req.params.metric);
  });
}

module.exports = router;