var PouchDB = require('pouchdb');
var replicationStream = require('pouchdb-replication-stream');
PouchDB.plugin(require('pouchdb-upsert'));
var fs = require('fs');
PouchDB.plugin(replicationStream.plugin);
PouchDB.adapter('writableStream', replicationStream.adapters.writableStream);
var db;
var startDB = function() {
    db = new PouchDB('thresholds');
    var changes = db.changes({
        since: 'now',
        live: true,
        include_docs: true
    }).on('change', function(change) {
    // handle change
    }).on('complete', function(info) {
    // changes() was canceled
    }).on('error', function (err) {
    console.log(err);
    });
    
}


var dbmodules = module.exports = {
    readThreshold: function(id) {
        db.get(id).then(function (doc) {
            return doc;
        });
    },
    readAllThresholds: function(socket) {
        db.allDocs({
            include_docs: true,
            latest: true
          }, function(err, response) {
            if (err) { return console.log(err); }
            var allThresholds = response;
            socket.emit("thresholds", allThresholds);
            return response;
            // handle result
        });
    },
    readAllMetrics: function(res) {
        db.allDocs({
            include_docs: true,
            latest: true
          }, function(err, response) {
            if (err) { return console.log(err); }
            var allMetrics = response;
            res.send(allMetrics);
        });
    },
    readMetric: function(res,metric) {
        db.get(metric).then(function (doc) {
            res.send(doc);
        });
    },
    writeThreshold: function(doc) {
        db.put(doc);
    },
    newThreshold: function(doc) {

        db.put({
            _id: doc,
            warning: "10",
            critical: "5",
            name: doc,
            comparemethod: "lt",
            perfdata: "true"
          }).then(function (response) {
            // handle response
          }).catch(function (err) {
          });
    },
    newMetric: function(doc,datanum) {
        var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        db.putIfNotExists({
            _id: doc,
            warning: "10",
            critical: "5",
            name: doc,
            comparemethod: "lt",
            perfdata: "true",
            lastvalue: datanum,
            date: date
        }).catch(function (err) {
            console.log(err);
        });
        db.upsert({
            _id: doc,
            lastvalue: datanum,
            date: date
        }).catch(function (err) {
            console.log(err);
        });
    },
    updateThreshold: function(data) {
        console.log(data);
        var thresholdType = data[0].substring(0,data[0].indexOf("---"));
        var thresholdId = data[0].substring(data[0].lastIndexOf("---")+3);
        var thresholdValue = data[1];
        console.log(thresholdType);
        console.log(thresholdId);
        console.log(data[1]);
        db.get(thresholdId).then(function (doc) {
            switch (thresholdType)
            {
                case "1":
                    doc.warning = thresholdValue;
                    break;
                case "2":
                    doc.critical = thresholdValue;
                    break;
                case "3":
                    doc.name = thresholdValue;
                    break;
                case "4":
                    doc.comparemethod = thresholdValue;
                    break;
                case "5":
                    doc.perfdata = thresholdValue;
                    break;
            }
            console.dir(doc);
            // put them back
            return db.put(doc).then(function (response) {
                console.log(response);
                // handle response
              }).catch(function (err) {
                  console.log(err);
              });
          });

    },
    exportThresholds: function() {
        var ws = fs.createWriteStream('nagios_cfg/thresholds.json');
        db.dump(ws).then(function (res) {
        // res should be {ok: true}
        });
    },importThresholds: function() {
        if (fs.existsSync('nagios_cfg/database.json')){
            var rs = fs.createReadStream('nagios_cfg/thresholds.json');
            db.load(rs).then(function (res) {
                // res should be {ok: true}
            });
        }
    }
}
startDB();