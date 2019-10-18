var restify = require('restify');
var fs = require('fs');
var respond = function(req, res, next) {
    fs.readFile( 'responds' + req.params['*'] + '.xml', 'utf8', function(err, data) {
        if (err) {
            console.log("can't read " + req.params['*'] + ".xml file");
            res.send("the function " + req.params['*'] + " is not defined");
            next();
        }
        res.header('content-type', 'application/xml');
        res.send(data);
        next();
    });
}
var server = restify.createServer();
server.get("*", respond);
server.listen(3001, function() {
  console.log('%s listening at %s', server.name, server.url);
});