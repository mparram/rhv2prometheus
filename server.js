var Request = require("request");
var metrics = require('./lib/metrics');
var inventory = require('./lib/inventory');
var events = require('./lib/events');
var db = require('./lib/db');
let xmlParser = require('xml2json');
var path = require('path');
var dotenv = require('dotenv').config();
var fs = require('fs');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var Keycloak = require('keycloak-connect');
var cors = require('cors');
var api = require('./lib/api');
var app = express();
app.use(bodyParser.json());
app.use(cors());
var memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'D9uLJCX65dPCuepR',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));
var keycloak = new Keycloak({ store: memoryStore });
app.use(express.static(path.join(__dirname, 'static')));
app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/'
}));
app.use('/api', api);

// Load RHV Server or set to simulator default
var RHVserver = process.env.RHVserver || "http://localhost:3001" ;//"https://rhvm-b5f6.rhpds.opentlc.com"; // "http://localhost:3001";//
console.log(RHVserver);
// If RHVtest = true then RHV Server to simulator default; to deprecate
if (process.env.RHVtest){
  var RHVserver = "https://localhost:3001" ;
}



// Load variable to enable record api outputs to use in simulator
global.RHVrecord = process.env.RHVrecord || false ;

// Objects to monitor as /ovirt-engine/api/[RHVObject]
// var RHVObjects = ["vms","hosts","clusters","datacenters","networks","vmpools","storagedomains"];
var RHVObjects = ["vms","hosts","clusters","datacenters","networks","vmpools","storagedomains"];

if(process.env.RHVCredentials == ""){
  console.log("Wrong credentials in .env file, use base64 as 'username@domain:password'");
  process.exit(1);
}

const websocket = require('./websocket');
const server = require('http').createServer(app);
server.listen(8080);
const io = websocket.init(server);
const nspevents = io.of('/events');
const nspProm2Nagios = io.of('/prom2nagios');
const nspThresholds = io.of('/thresholds');
app.get("/events", keycloak.protect(), (req, res) => {
  res.sendFile(path.join(__dirname, 'events.html')); 
  nspevents.on('connection', function(socket){
    events.getEvents(RHVserver);
    console.log('a user connected to events');
  });
});
app.get('/', keycloak.protect(), (req, res) => {
  res.redirect('/events');
});
if (process.env.NagiosCFGBuilder){
  var nagios = require('./lib/nagios');
  app.get('/prom2nagios', keycloak.protect(), (req, res) => {
    res.sendFile(path.join(__dirname, 'prom2nagios.html'));
  });
  app.get('/thresholds', keycloak.protect(), (req, res) => {
    res.sendFile(path.join(__dirname, 'thresholds.html'));
    nspThresholds.on('connection', function(socket){
      db.readAllThresholds(socket);
      console.log('a user connected to thresholds');
      socket.on('updateVal', function(data){
        db.updateThreshold(data);
      });
    });
  });
  app.get('/nagios_cfg/:file', (req, res) => {
    console.log(req.params.file);
    if(fs.existsSync(path.join(__dirname, '/nagios_cfg/', req.params.file))){
      var aliasfileArr =  req.params.file.split("_");
      res.download(path.join(__dirname, '/nagios_cfg/', req.params.file), aliasfileArr[0] + ".cfg");
    }

  });
}

app.get('/metrics', (req, res) => {
  metrics.sendMetricsRoute(res);
});


app.get('/metrics_menu', keycloak.protect(), (req, res) => {
  res.sendFile(path.join(__dirname, 'metrics_menu.html'));
});


// Interval to query metrics
setInterval(function(){
  inventory.getListFromArray(RHVObjects, RHVserver);
},300000);

//query metrics on load
inventory.getListFromArray(RHVObjects, RHVserver);