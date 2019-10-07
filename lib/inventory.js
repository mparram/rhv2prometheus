var parseString = require('xml2js').parseString;
var Request = require("request");
var metrics = require("./metrics");
var counter = require('./counter.js');
var fs = require('fs');
var names = [];

module.exports = {
    //Initial api query for each object in RHVObjects
    getAPIJSON : function(URI, RHVserver, cb){
        if (!URI){
            console.log("error with URI");
            var URI = URIdefault;
        }
        var priority = 100;
        var intervalCounter = setInterval(function() { 
            if (counter.request() === true) {
                Request.get({
                    "headers": { "content-type": "application/xml",
                                "Authorization" : "Basic " + process.env.RHVCredentials
                    },
                    "strictSSL" : false,
                    "url": RHVserver + "/ovirt-engine/api/" + URI
                }, (error, response, body) => {
                    if(error) {
                        return console.dir(error);
                    }
                    if(RHVrecord == true){
                        fs.writeFile("./responds/ovirt-engine/api/" + URI + '.xml', body, function (err){
                            if (err) throw err;
                            console.log('It\'s saved! ' +  "./responds/ovirt-engine/api/" + URI + '.xml');
                        }); 
                    }
                    parseString(body, function (err, result) {
                        if(err) {
                            console.log("error parseString");
                            return console.dir(error);
                        }
                        return cb(result);
                    });
                });
                clearInterval(intervalCounter);
            }else if (priority >= 11){
                priority--;
            }else{
                console.warn("overload api calls2");
                 
            }
        }, priority); 

    },
    //Get object list from RHVObjects
    getListFromArray : function(arrObjects, RHVserver ){
        console.log("triggered metric generation iteration");
        var metrics = require("./metrics");
        arrObjects.forEach(element => {
            let invent = module.exports.getAPIJSON(element, RHVserver, function(response){
                json = response[Object.keys(response)[0]];
                for (var key in json) {
                    if (json.hasOwnProperty(key)) {
                        json[key].forEach(element => { 
                            var hrefObj = element[Object.keys(element)[0]]["href"];
                            metrics.buildMetrics(null, key, hrefObj, RHVserver, function(err, data){
                                if(err) {
                                    return console.dir(error);
                                }
                            });
                        });
                   }
                }
            });
        });
    },
    //Get metric list from [...]/statistics.xml
    getStatistics : function(URI, RHVserver, cb){

        if (!URI){
            console.log("error with URI");
            var URI = URIdefault;
        }        
        var priority = 100;
        var intervalCounter = setInterval(function() {
            if (counter.request() === true) {
                clearInterval(intervalCounter);
                Request.get({
                    "headers": { "content-type": "application/xml",
                                "Authorization" : "Basic " + process.env.RHVCredentials
                    },
                    "strictSSL" : false,
                    "url": RHVserver + URI + "/statistics"
                }, (error, response, body) => {
                    if(error) {
                        return console.dir(error);
                    }
                    if(RHVrecord == true){
                        fs.mkdir("./responds/" + URI, { recursive: true }, (err) => {
                            if (err) throw err;
                            fs.writeFile("./responds/" + URI + '/statistics.xml', body, function (err){
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
                        return cb(result);
                    });
                });
            }else if (priority >= 11){
                priority--;
            }else{
                console.warn("overload api calls3");
                clearInterval(intervalCounter);
            }
        }, priority);
        
    },
    //Get metric list from disks attached to VM
    getDiskFromVMs : function(URI, RHVserver, cb){
        if (!URI){
            console.log("error with URI");
            var URI = URIdefault;
        }
        var priority = 100;
        var intervalCounter = setInterval(function() {
            if (counter.request() === true) {
                clearInterval(intervalCounter);
                Request.get({
                    "headers": { "content-type": "application/xml",
                                "Authorization" : "Basic " + process.env.RHVCredentials
                    },
                    "strictSSL" : false,
                    "url": RHVserver + URI + "/diskattachments"
                }, (error, response, body) => {
                    if(error) {
                        return console.dir(error);
                    }
                    if(RHVrecord == true){
                        fs.mkdir("./responds" + URI.slice(0,URI.lastIndexOf("/")) + "/", { recursive: true }, (err) => {
                            if (err) throw err;
                            fs.writeFile("./responds" + URI + '/diskattachments.xml', body, function (err){
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
                        return cb(result);
                    });
                });
            }else if (priority >= 11){
                priority--;
            }else{
                console.warn("overload api calls4");
                clearInterval(intervalCounter);
            }
        }, priority);
        
        
    },
    // Get object name from an URI
    getName : function(URI, RHVserver, cb){
        if (!URI){
            return cb("---");
        }

        var queryNames = function(href1, RHVserver){
            if (typeof names[href1] == 'undefined'){
                Request.get({
                    "headers": { "content-type": "text/xml",
                                "Authorization" : "Basic " + process.env.RHVCredentials
                    },
                    "strictSSL" : false,
                    "url": RHVserver + URI 
                }, (error, response, body) => {
                    if((RHVserver != "http://localhost:3001") && (RHVrecord == "true")){
                        if(error) {
                            return console.dir(error);
                        }
                        fs.mkdir("./responds/" + URI.slice(0,URI.lastIndexOf("/")), { recursive: true }, (err) => {
                            if (err) throw err;
                            console.log("./responds" + URI + '.xml');
                            fs.writeFile("./responds" + URI + '.xml', body, function (err){
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
                        names[href1] = result[Object.keys(result)[0]].name.toString();
                        return cb(names[href1]);
                    });
                });
            }else{
                return cb(names[href1]);
            }
        }

        queryNames(URI, RHVserver);

    }

    ,getNamesFromStats : function(URI, RHVserver, cb){
        if (!URI){
            return cb("---");
        }

        var queryNamesStats = function(href1, RHVserver){
            if (typeof names[URI] == 'undefined'){
                var priority = 100;
                var intervalCounter = setInterval(function() {
                    if (counter.request() === true) {
                        clearInterval(intervalCounter);
                        Request.get({
                            "headers": { "content-type": "application/xml",
                                        "Authorization" : "Basic " + process.env.RHVCredentials
                            },
                            "strictSSL" : false,
                            "url": RHVserver + href1 
                        }, (error, response, body) => {
                            if(RHVrecord == true){
                                if(error) {
                                    return console.dir(error);
                                }
                                fs.mkdir("./responds/" + href1.slice(0,href1.lastIndexOf("/")), { recursive: true }, (err) => {
                                    if (err) throw err;
                                    fs.writeFile("./responds" + href1 + '.xml', body, function (err){
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
                                result[Object.keys(result)[0]]['statistic'].forEach(element => {
                                    if (typeof element['$'].href !== 'undefined'){
                                        names[element['$'].href] = element.name[0];
                                    }
                                });   
                                if (typeof names[URI] !== 'undefined'){
                                    return cb(names[URI]);
                                }else{
                                    return cb("unknown_name");
                                } 
                            });
                        });
                    }else if (priority >= 11){
                        priority--;
                    }else{
                        clearInterval(intervalCounter);
                    }
                }, priority);
                
            }else{
                return cb(names[URI]);
            }
        }
        var URIarr= URI.split("/");
        var URIstats = "";
        URIlimit = "statistics";
        for (let index = 1; index <= URIarr.indexOf(URIlimit); index++) {
            URIstats = URIstats + "/" +  URIarr[index];   
        }
        queryNamesStats(URIstats, RHVserver);
    },
    // Get metrics from storageDomains
    getStorageDomain : function(URI, RHVserver, cb){
        if (!URI){
            console.log("error with URI");
            var URI = URIdefault;
        }
        var priority = 100;
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
                    if(RHVrecord == true){
                        fs.mkdir("./responds" + URI.slice(0,URI.lastIndexOf("/")) + "/", { recursive: true }, (err) => {
                            if (err) throw err;
                            fs.writeFile("./responds" + URI + '.xml', body, function (err){
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
                        return cb(result);
                    });
                });
            }else if (priority >= 11){
                priority--;
            }else{
                console.warn("overload api calls");
                clearInterval(intervalCounter);
            }
        }, priority);
    }
}




