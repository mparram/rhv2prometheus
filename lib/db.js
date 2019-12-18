var PouchDB = require('pouchdb');
var replicationStream = require('pouchdb-replication-stream');
PouchDB.plugin(require('pouchdb-upsert'));
var fs = require('fs');
PouchDB.plugin(replicationStream.plugin);
PouchDB.adapter('writableStream', replicationStream.adapters.writableStream);
var db;
var startDB = function() {
    var localPouchDB = PouchDB.defaults({
        prefix: 'db/'
      });
    db = new localPouchDB('thresholds');
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
    readNagiosThresholds: function(cb) {
        db.allDocs({
            include_docs: true,
            latest: true
          }, function(err, response) {
            if (err) { return console.log(err); }
            cb(response);
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
            var arrMetrics = [];
            for (var i in response.rows) {
                arrMetrics.push(response.rows[i].doc);
            }
            res.json(arrMetrics);
        });
    },
    readMetric: function(res,metric) {
        db.get(metric).then(function (doc) {
            res.json(doc);
        });
    },
    writeThreshold: function(doc) {
        db.put(doc);
    },
    newMetric: function(docId,datanum,date) {
        db.putIfNotExists({
            _id: docId,
            warning: "10",
            critical: "5",
            name: docId,
            comparemethod: "lt",
            perfdata: "true",
            lastvalue: datanum,
            date: date
        }, function(){
            db.upsert(docId, function(doc){
                doc.lastvalue = datanum;
                doc.date = date;
                return doc;
            }).catch(function (err) {
                console.log(err);
            });
        });
    },
    updateThreshold: function(data) {
        var thresholdType = data[0].substring(0,data[0].indexOf("---"));
        var thresholdId = data[0].substring(data[0].lastIndexOf("---")+3);
        var thresholdValue = data[1];
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
                case "6":
                    doc.lastvalue = thresholdValue;
                    break;
                case "7":
                    doc.dateCheck = thresholdValue;
                    break;
            }
            return db.put(doc).then(function (response) {
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
        if (fs.existsSync('nagios_cfg/thresholds.json')){
            var rs = fs.createReadStream('nagios_cfg/thresholds.json');
            db.load(rs).then(function (res) {
                // res should be {ok: true}
            });
        }
    }
}
startDB();