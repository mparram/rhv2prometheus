var restify = require('restify');
var fs = require('fs');
var parser = require('xml2json');
var parseString = require('xml2js').parseString;

var respond = function(req, res, next) {
    //console.log(req.params['*']);
    //console.log('responds' + req.params['*'] + '.xml');
    fs.readFile( 'responds' + req.params['*'] + '.xml', 'utf8', function(err, data) {
        if (err) {
            console.log("can't read " + req.params['*'] + ".xml file");
            res.send("the function " + req.params['*'] + " is not defined");
            next();
        }
        //console.dir(data);
        res.header('content-type', 'application/xml');
        res.send(data);
        next();
    });

}

var server = restify.createServer();
server.get("*", respond);
//server.head(/.*/, respond);


server.listen(3001, function() {
  console.log('%s listening at %s', server.name, server.url);
});