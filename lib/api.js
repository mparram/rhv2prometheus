const bodyParser = require('body-parser');
var db = require("./db");
var express = require('express');
var router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/', function(req, res) {
    response = {
     message: 'RHV2Prometheus API'
    };
    res.send(response);
});

router.get('/metrics', function(req, res) {
    db.readAllMetrics(res);
});
router.get('/metrics/:metric', function(req, res) {
    db.readMetric(res,req.params.metric);
});



module.exports = router;