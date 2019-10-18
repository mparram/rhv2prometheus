const bodyParser = require('body-parser');
var db = require("./db");
var express = require('express');
var router = express.Router();
var Client = require('3scale').Client;
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json({ type: 'application/*+json', inflate: true }));
client = new Client({host: "3scale-admin.apps.hackathon.rhmi.io", port: 443});
router.get('/', function(req, res) {
    response = {
     message: 'RHV2Prometheus API'
    };
    res.send(response);
});
router.get('/metrics', function(req, res) {
    client.authrep_with_user_key({ service_token: "xdRrqgsj9x8P0pka4Zr4Erp6nrqfQcAz", service_id: "API", user_key: "29b116a7287bec83fe892da977a92d81", usage: { "hits": 1 } }, function(response){
        if(response.is_success()) {
            console.log(response);
          } else {
            throw new Error("not authorized " + response.error_message);
          }
    });
    db.readAllMetrics(res);
});
router.get('/metrics/:metric', function(req, res) {
    client.authrep_with_user_key({ service_token: "xdRrqgsj9x8P0pka4Zr4Erp6nrqfQcAz", service_id: "API", user_key: "29b116a7287bec83fe892da977a92d81", usage: { "hits": 1 } }, function(response){
        if(response.is_success()) {
            console.log(response);
          } else {
            throw new Error("not authorized " + response.error_message);
          }
    });
    db.readMetric(res,req.params.metric);
});
module.exports = router;