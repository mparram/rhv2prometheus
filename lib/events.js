var parseString = require('xml2js').parseString;
var Request = require("request");
var inventory = require('./inventory');
var fs = require('fs');
module.exports = {
    getEvents : function(RHVserver, cb){
        //Query to filter events with severity higher than normal
        URI = "/ovirt-engine/api/events?search=severity>normal";
        Request.get({
            "headers": { "content-type": "application/xml",
                        "Authorization" : "Basic " + process.env.RHVCredentials
            },
            "strictSSL" : false,
            "url": RHVserver + URI
        }, (error, response, body) => {
            if ((RHVserver != "http://localhost:8080") && (RHVrecord === true)){
                fs.writeFile("./responds/ovirt-engine/api/events.xml", body, function (err){
                    if (err) console.log(err);
                    console.log('It\'s saved!');
                });
            }
            if(error) {
                return console.dir(error);
            }
            parseString(body, function (err, result) {
                var sliced = [];
                for (var i=0; i<1000; i++){
                    if (result['events'].event[i]) {
                        sliced[i] = result['events'].event[i];
                    }  
                }
                console.dir(result['events'].event[1]['$'].id);
                result = sliced;
                if(err) {
                    return console.dir(error);
                }
                var names = [];
                var json = [];
                for (var key in result) {
                    json[key] = {
                        "severity": result[key].severity,
                        "time": result[key].time,
                        "description": result[key].description,
                        "code": result[key].code
                    };
                    if (result[key].hasOwnProperty("cluster")) {
                        var cluster = result[key].cluster[0]['$']["href"];
                        json[key].cluster = cluster;
                        if (!names.hasOwnProperty("cluster")) {
                            json[key].cluster = cluster;
                            names[cluster] = "";
                        }
                    }else{
                        json[key].cluster = "---";
                    }
                    if (result[key].hasOwnProperty("host")) {
                        var host = result[key].host[0]['$']["href"];
                        json[key].host = host;
                        if (!names.hasOwnProperty("host")) {
                            json[key].host = host;
                            names[host] = "";
                        }
                    }else{
                        json[key].host = "---";
                    }
                }
                for (var href in names){
                    var queryNames = function(href1){
                        var URI = href1;
                        if (names[URI] != "---"){
                            inventory.getName(URI, RHVserver, function(data){
                                names[URI] = data;
                                for (var key in json) {
                                    if(json[key].cluster == URI){
                                        json[key].cluster = names[URI];
                                    }
                                    if(json[key].host == URI){
                                        json[key].host = names[URI];
                                    }
                                }
                            });
                        }
                    }
                    queryNames(href);
                }
                var counter = 10;
                var interval = setInterval(() => {
                    counter--
                    var ready = true;
                    for (var href2 in names) {
                        if(names[href2] == ""){
                            ready = false;
                        }
                    }
                    if ((counter === 0) || (ready)){
                        const io = require('../websocket').getio().of("/events");
                        io.emit("events", json);
                        clearInterval(interval);
                    }
                }, 500);
            });
        });
    }
}