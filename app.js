var fs = require('fs');
var readline = require('readline');
var fetch = require('node-fetch');

const APIKEY = 'your APIKey';
let urlSet = [
    "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList" + APIKEY + '&strSrch=',
    "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid" + APIKEY + '&busRouteId=',

];

var readInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

module.exports = {
    doFetch: doFetch,
    getDataFromURL: getDataFromURL,
    BusLocationData: BusLocationData,
}

readLineEventHendler(0, '1. busNm,busId>', 'getDataFromURL');

function doFetch(url, hendler) {
    fetch(url)
        .then(function (res) {
            return res.text();
        }).then(function (body) {
            //data = new tool['BusRouteId'](body);
            module.exports[hendler](body);
        });
}

function getDataFromURL(res) {
    let BusIddata = [];

    readInterface.close();
    let temp = res.match(/\<busRouteId>.+?\<corp/g);
    let tempString = '';
    let offset = 0;
    //TODO : 나중에 정규식으로 추출하기
    for (let item of temp) {
        let start = Number(item.indexOf('<busRouteNm>'));
        let end = Number(item.indexOf('</busRouteNm>'));
        BusIddata.push(item.substring(21, 12));
        tempString += '  ' + offset + '. ' + item.substring(21, 12) + '-' + item.substring(end, start + 12);
        offset++;
    }

    let url = urlSet[1] + BusIddata[0];
    setInterval(function(){
        doFetch(url, 'BusLocationData')
    }, 60000);
    
    //readLineEventHendler(1, '2. select bus' + tempString + '>', 'BusLocationData');
}

function BusLocationData(res) {
    let indata = [];
    let patten = /<[^>](.*?)>/gi;
    let temp = res.match(/\<plainNo>.+?\<rtDist>/g);
    for (let item of temp) {
        indata.push(item.replace(patten, " ").match(/\s.+?\s/g));
    }
    saveFile(indata);
}

function saveFile(data) {

    let item;
    var time = new Date();
    for (let item of data) {
        let temp = {
            busNm: (item[0].replace(/(^\s*)|(\s*$)/g, '')),
            busPosX: (item[1].replace(/(^\s*)|(\s*$)/g, '')),
            busPosY: (item[2].replace(/(^\s*)|(\s*$)/g, '')),
            time: time.getHours()+":"+time.getMinutes()+":"+time.getSeconds()
        };
        fs.appendFile('bus_json.json', JSON.stringify(temp)+"\r\n", "utf-8", function(error){
            if(error) throw error;
        });
    }
}
function readLineEventHendler(offset, questionString, hendler) {

    readInterface.setPrompt(questionString);
    readInterface.prompt();
    readInterface.on('line', function (line) {
        let url = urlSet[offset] + (questionString.charAt(0) == 1 ? String(line) : data[Number(line)]);
        console.log(url);
        doFetch(url, hendler);
    });
}
