var fs = require('fs');
var readline = require('readline');
var fetch = require('node-fetch');

var oldCoorSet = [];


const APIKEY = 'yourAPIKEY';
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
    setInterval(function () {
        doFetch(url, 'BusLocationData');
    }, 15000);

    //readLineEventHendler(1, '2. select bus' + tempString + '>', 'BusLocationData');
}

function BusLocationData(res) {
    let indata = [];
    let patten = /<[^>](.*?)>/gi;
    let tempPlainNo = res.match(/\<plainNo>.+?\<rtDist>/g);
    let tempGps = res.match(/\<gpsX>.+?\<isFullFlag>/g)
    for (let i = 0; i < tempPlainNo.length; i++) {
        indata.push(tempPlainNo[i].replace(patten, " ").match(/\s.+?\s/g).concat(tempGps[i].replace(patten, " ").match(/\s.+?\s/g)));
    }

    saveFile(indata);
}

function saveFile(busInfo) {

    let offset = 0;
    let item;
    var time = new Date();
    for (let item of busInfo) {
        let gpsX = Number(item[3].replace(/(^\s*)|(\s*$)/g, ''));
        let gpsY = Number(item[4].replace(/(^\s*)|(\s*$)/g, ''));
        let posX = Number(item[1].replace(/(^\s*)|(\s*$)/g, ''));
        let posY = Number(item[2].replace(/(^\s*)|(\s*$)/g, ''));
        let temp = {
            busNm: (item[0].replace(/(^\s*)|(\s*$)/g, '')),
            busPosX: posX,
            busPosY: posY,
            busGpsX: gpsX,
            busGpsY: gpsY,
            angle: getAngle(posX, posY, offset),
            time: time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds()
        };
        
        fs.appendFile(String(temp.busNm)+'.json', JSON.stringify(temp)+"\r\n", "utf-8", function(error){
            if(error) throw error;
        });
        
        oldCoorSet[offset] = temp;
        offset++;
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

function getAngle(newCoordinateX, newCooordinateY, offset) {
    if (oldCoorSet[offset] === undefined)
        return null;
    ''
    let angleFordegrees = Math.atan2(newCooordinateY - oldCoorSet[offset].busPosY, newCoordinateX - oldCoorSet[offset].busPosX) * 180 / Math.PI;
    if (angleFordegrees < 0 || angleFordegrees > 360)
        angleFordegrees = getCorrectionValue(angleFordegrees);
    else if(angleFordegrees == 0){
        if(oldCoorSet[offset].angle === null)
            return 0;
        else
            return oldCoorSet[offset].angle
    }
    return angleFordegrees;
}

function getCorrectionValue(angle){
    let angleValue = Math.abs(angle);
    let rotation = parseInt(angleValue / 360)

    if(rotation > 1)
        return angleValue - 360
    else
        return angleValue - (360 * rotation)

}