var EsConnector = angular.module('EsConnector', ['elasticsearch']);

//Device gateway API
EsConnector.service('es', function (esFactory) {
  return esFactory({ host: 'search-factory-3qlqnquuunbhqkfnynbdzvuyta.us-east-1.es.amazonaws.com:80' });
});

EsConnector.controller('QueryController', function($scope, es) {
    $scope.gauges = [];

    $scope.data = { 
        devicegateway: { 
            fields : {
                speed : "speed",
                amps : "amps",
                voltage : "voltage" 
            },
            timestamp : "",
            color : ""
        }, 
        aws: { 
            fields : {
                speed : "speednew",
                amps : "ampsnew",
                voltage : "voltagenew" 
            },
            timestamp : "",
            white : ""
        }, 
    }

    createGauges();
    setInterval(function(){ 
        updateDeviceGateway($scope.data.devicegateway);
    }, 4000);

    setInterval(function(){ 
        updateAWS($scope.data.aws);
    }, 500);

    function updateDeviceGateway(data){
        $.ajax({
            url: 'http://XXX:5000/get_current_data',//'http://localhost/test.json',
            data: {
                format: 'json'
            },
            type: 'GET',
            success: function(response) {
                parseResponse(data,response);
            },
        });
    }

    function updateAWS(data){
        es.search({
        index: 'sensordata',
        // type: 'factory',
        size : 1,
        body : {
            "size" : 1,
                "sort" : [
                    { "timestamp" : {"order" : "desc"}}
            
                ],
                "query" : {
                    "term" : { "factory" : "factory" }
                }
            }}
        ).then(function (response) {
            //console.log(response.hits.hits);
            var hits = response.hits.hits[0]['_source'];
            parseResponse(data,hits);
        });
    }

    function parseResponse(data,hits){
        data.timestamp = fromUTCtoLocal(hits.timestamp);
        data.color = hits.color;
        Object.keys(data.fields).forEach(function(key) {
            var value = hits[key];
            $scope.gauges[data.fields[key]].redraw(value);
        });
    }

    function fromUTCtoLocal(date){
        var stillUtc = moment.utc(date).toDate();
        return moment(stillUtc).local().format('YYYY-MM-DD HH:mm:ss');
    }

    function createGauges() {
        createGauge("amps", "Amps",0,1.5,true);
        createGauge("speed", "Speed",0,1000);
        createGauge("voltage", "Voltage",0.9);

        createGauge("ampsnew", "Amps",0,1.5,true);
        createGauge("speednew", "Speed",0,1000);
        createGauge("voltagenew", "Voltage",0.9);
    }
    
    function createGauge(name, label, min, max,left) {
        var config = {
            size: 200,
            label: label,
            min: undefined != min ? min : 0,
            max: undefined != max ? max : 100,
            minorTicks: 5
        }

        var range = config.max - config.min;
        config.yellowZones = [{
            from: config.min + range * (left ? 0.1 : 0.75),
            to: config.min + range * (left ? 0.25 : 0.9)
        }];
        config.redZones = [{
            from: (left ? 0:config.min + range * 0.9),
            to: (left ? config.min + range * 0.1:config.max)
        }];

        $scope.gauges[name] = new Gauge(name + "GaugeContainer", config);
        $scope.gauges[name].render();
    }
});