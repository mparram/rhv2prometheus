var requestInterval = 100; // miliseconds interval for api request
var Counter = module.exports = {
    count: true,
    request: function() {
        if (Counter.count === true) {
            //console.log("launch");
            Counter.count = false;
            Counter.timer();
            return true;
        }else{
            //console.log("wait...");
            return false;
        }
    },
    timer: function() {
        var timeout = setTimeout(() => {
            //console.log("free");
            Counter.count = true;
        }, requestInterval);
    }
}