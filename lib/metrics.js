var parseString = require('xml2js').parseString;
var inventory = require("./inventory");
var db = require("./db");
var counter = require('./counter.js');
var Request = require("request");
var fs = require('fs');
var path = require('path');
//Objects that contain /[objID]/statistics
//var RHVObjectsWithStatistics = ["host","vm","disk"];
var RHVObjectsWithStatistics = ["host","vm","disk"];
const Prometheus = require('prom-client');
//Default nodejs metrics to Prometheus
//const collectDefaultMetrics = Prometheus.collectDefaultMetrics;
//collectDefaultMetrics({ timeout: 5000 });
module.exports = {
    buildMetrics : function(prefix = null, key, hrefObj, RHVserver, cb){
        RHVObjectsWithStatistics.find(function(RHVObject){
            if (RHVObject == key) {
                var dateStamp;
                dateStamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                let statistics = inventory.getStatistics(hrefObj, RHVserver, function(responsestats){
                    jsonstats = responsestats[Object.keys(responsestats)[0]];
                    for (var key2 in jsonstats) {
                        if (jsonstats.hasOwnProperty(key2)) {
                            jsonstats[key2].forEach(elementstats => { 
                                var metricName;
                                if (typeof elementstats[Object.keys(elementstats)[0]]["href"] !== 'undefined'){
                                    var datanum = elementstats["values"][0][Object.keys(elementstats["values"][0])[0]][0][Object.keys(elementstats["values"][0][Object.keys(elementstats["values"][0])[0]][0])[0]][0];
                                    if ((elementstats[Object.keys(elementstats)[0]]["href"] == undefined)|| (typeof elementstats[Object.keys(elementstats)[0]]["href"] === 'undefined')){
                                        return next();
                                    }
                                    inventory.getNamesFromStats(elementstats[Object.keys(elementstats)[0]]["href"],RHVserver,function(data){
                                
                                        if ((data == undefined)|| (typeof data === 'undefined')){
                                            var resourceName = "undefined";
                                            return;
                                        }
                                        if((typeof data == 'string') && (data != "")) {
                                            var resourceName = data.replace(/[^a-zA-Z0-9_]/g, "_");
                                        }else{
                                            var resourceName = "resource_empty";
                                        }
                                        var parentSplit =  JSON.stringify(elementstats[Object.keys(elementstats)[0]]["href"]).split("/");
                                        var parent;
                                        if (parentSplit.length >= "4"){
                                            parent = "/" + parentSplit[1] + "/" + parentSplit[2] + "/" + parentSplit[3] + "/" + parentSplit[4];
                                        }else{
                                            parent = elementstats[Object.keys(elementstats)[0]]["href"];
                                        }
                                        inventory.getName(parent,RHVserver,function(data2){
                                            if((typeof data2 == 'string') && (data2 != "")) {
                                                var parentName = data2.replace(/[^a-zA-Z0-9_]/g, "_");
                                            }else{
                                                var parentName = "parent_empty";
                                            }
                                            if (parentName ==  elementstats["name"][0].replace(/[^a-zA-Z0-9_]/g, "_")){
                                                parentName = "";
                                            }
                                            if (elementstats["description"][0].includes("(agent)")){
                                                metricName = elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_")
                                                            .slice(1,elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4 +
                                                                    elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_")
                                                                    .slice(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4 ,
                                                                            elementstats[Object.keys(elementstats)[0]]["href"]
                                                                            .substr(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4), 
                                                                                    elementstats[Object.keys(elementstats)[0]]["href"].substr(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4).indexOf("/") )        
                                                            )
                                                            +  parentName + "_" + resourceName.replace(/[^a-zA-Z0-9_]/g, "_") +  "_agent";   
                                            }else{
                                                metricName = elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_")
                                                            .slice(1,elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4 +
                                                                    elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_")
                                                                    .slice(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4 ,
                                                                            elementstats[Object.keys(elementstats)[0]]["href"]
                                                                            .substr(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4), 
                                                                                    elementstats[Object.keys(elementstats)[0]]["href"].substr(elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4).indexOf("/") )        
                                                            )
                                                            +  parentName + "_" + resourceName.replace(/[^a-zA-Z0-9_]/g, "_");
                                            }
                                            let counter = Prometheus.register.getSingleMetric(metricName);
                                            if(counter == undefined){
                                                    counter = new Prometheus.Gauge({
                                                    name: metricName,
                                                    help: elementstats["description"][0].replace(/[^a-zA-Z0-9_]/g, "_"),
                                                    labelNames: ['id'] 
                                                });
                                            }else if(typeof counter == 'undefined'){
                                                    counter = new Prometheus.Gauge({
                                                    name: metricName,
                                                    help: elementstats["description"][0].replace(/[^a-zA-Z0-9_]/g, "_"),
                                                    labelNames: ['id'] 
                                                });
                                            }
                                            counter.labels(elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_"), ).set(parseInt(datanum));
                                            db.newMetric(metricName,datanum,dateStamp);
                                        });
                                    });
                                }else{
                                }
                            });
                       }
                    }
                });
            }
        });
        if(key == "vm"){
            let disk_attachment = inventory.getDiskFromVMs(hrefObj, RHVserver, function(responsestats){
                jsonstats = responsestats[Object.keys(responsestats)[0]];
                for (var key2 in jsonstats) {
                    if (jsonstats.hasOwnProperty(key2)) {
                        jsonstats[key2].forEach(elementstats => { 
                            var metricName;
                            module.exports.getDiskMetrics(prefix, elementstats['disk'][0]['$']["href"], RHVserver, function(data) {
                                inventory.getName(elementstats['vm'][0]['$']["href"],RHVserver,function(data2){
                                    inventory.getName(elementstats['disk'][0]['$']["href"],RHVserver,function(data3){
                                        if((typeof data2 == 'string') && (data2 != "")) {
                                            var parentName = data2.replace(/[^a-zA-Z0-9_]/g, "_");
                                        }else{
                                            var parentName = "parent_empty";
                                        }
                                        if((typeof data3 == 'string') && (data3 != "")) {
                                            var resourceName = data3.replace(/[^a-zA-Z0-9_]/g, "_");
                                        }else{
                                            var resourceName = "resource_empty";
                                        }
                                        metricName = elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_").slice(1,elementstats[Object.keys(elementstats)[0]]["href"].indexOf("api/") + 4) + parentName.replace(/[^a-zA-Z0-9_]/g, "_") + "_" + resourceName ;
                                        for (var metricDisk in data) {
                                            if ((!isNaN(data[metricDisk][0])) && (data[metricDisk][0] !== '')){
                                                metricNameFull = metricName + "_" + metricDisk.replace(/[^a-zA-Z0-9_]/g, "_");
                                                let counter = Prometheus.register.getSingleMetric(metricNameFull);
                                                if(counter == undefined){
                                                        counter = new Prometheus.Gauge({
                                                        name: metricNameFull,
                                                        help: metricDisk,
                                                        labelNames: ['id'] 
                                                    });
                                                }else if(typeof counter == 'undefined'){
                                                        counter = new Prometheus.Gauge({
                                                        name: metricNameFull,
                                                        help: metricDisk,
                                                        labelNames: ['id'] 
                                                    });
                                                }
                                                counter.labels(elementstats[Object.keys(elementstats)[0]]["href"].replace(/[^a-zA-Z0-9_]/g, "_"), ).set(parseInt(data[metricDisk]));
                                            } 
                                        }
                                    });                
                                });
                            });
                        });
                   }
                }
            });
        }else if(key == "storage_domain"){
            let storage_domain = inventory.getStorageDomain(hrefObj, RHVserver, function(responsestats){
                var metricName = responsestats[Object.keys(responsestats)]['$']["href"].replace(/[^a-zA-Z0-9_]/g, "_").slice(1,responsestats[Object.keys(responsestats)]['$']["href"].indexOf("api/") + 4) + "StorageDomain_" + responsestats[Object.keys(responsestats)]["name"][0].replace(/[^a-zA-Z0-9_]/g, "_") ;
                for (var metricStorage in responsestats[Object.keys(responsestats)]) {
                    if ((!isNaN(responsestats[Object.keys(responsestats)][metricStorage][0])) && (responsestats[Object.keys(responsestats)][metricStorage][0] !== '')){
                        metricNameFull = metricName + "_" + metricStorage.replace(/[^a-zA-Z0-9_]/g, "_");
                        let counter = Prometheus.register.getSingleMetric(metricNameFull);
                        if(counter == undefined){
                                counter = new Prometheus.Gauge({
                                name: metricNameFull,
                                help: metricStorage,
                                labelNames: ['id'] 
                            });
                        }else if(typeof counter == 'undefined'){
                                counter = new Prometheus.Gauge({
                                name: metricNameFull,
                                help: metricStorage,
                                labelNames: ['id'] 
                            });
                        }
                        counter.labels(responsestats[Object.keys(responsestats)]['$']["href"].replace(/[^a-zA-Z0-9_]/g, "_"), ).set(parseInt(responsestats[Object.keys(responsestats)][metricStorage][0]));
                    } 
                }
            });
        }
    },
    pushMetrics : function(URI, RHVserver, cb){
        //TODO
    },
    getDiskMetrics : function(prefix = null, URI, RHVserver, cb){
        if (!URI){
            return cb("---");
        }
        var priority = 1000;
        var intervalCounter = setInterval(function() {
            if (counter.request() === true) {
                clearInterval(intervalCounter);
                Request.get({
                    "headers": { "content-type": "application/xml",
                                "Authorization" : "Basic " + process.env.RHVCredentials
                    },
                    "strictSSL" : false,
                    "url": RHVserver + URI 
                }, (error, response, body) => {
                    if(error) {
                        return console.dir(error);
                    }
                    if(RHVrecord == "true"){
                        fs.mkdir("./responds/" + URI.slice(0,URI.lastIndexOf("/")), { recursive: true }, (err) => {
                            if (err) throw err;
                            fs.writeFile("./responds" + URI + '.xml', true, function (err){
                                if (err) throw err;
                                console.log('It\'s saved!');
                            });
                        });
                    }
                    parseString(body, function (err, result) {
                        if(err) {
                            console.dir(error);
                            return;
                        }
                        return cb(result[Object.keys(result)[0]]);
                    });
                });
            }else if (priority >= 11){
                priority--;
            }else{
                console.warn("overload api calls1");
                clearInterval(intervalCounter);
            }
        }, priority);   
    },
    sendMetricsRoute : function(res){
        res.end(Prometheus.register.metrics());
    },
    sendMetricsMenu : function(res){
        res.sendFile(path.join(__dirname, '../metrics_menu.html'));
        res.end(Prometheus.register.metrics());
    }
}