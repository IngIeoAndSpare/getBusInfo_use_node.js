var fs = require('fs');
var readline = require('readline');
var fetch = require('node-fetch');

var oldCoorSet = [];
var itemSet = [];
var rotationNm = 0;

const APIKEY = 'Your Key';
const BUS_SELECT = 1;
const ROTATION_TIME = 30000;
const ROTATION_LIMIT = 500;


let urlSet = [
    "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList" + APIKEY + '&strSrch=',
    "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid" + APIKEY + '&busRouteId=',

];
var readInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function jsonItemSet(busNumber, startTime) {
    this.busnumber = busNumber;
    this.startTime = startTime;
    this.itemArray = [];
}

jsonItemSet.prototype = {
    getJsonData: function () {
        return {
            busNumber: this.busnumber,
            startTime: this.startTime,
            busPosition: this.itemArray
        };
    },
    getItemLength: function () {
        return this.itemArray.length;
    },
    flushItemArray: function () {
        this.itemArray.length = 0;
    }
}

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

    let url = urlSet[1] + BusIddata[BUS_SELECT];

    setInterval(function () {
        doFetch(url, 'BusLocationData');
        rotationNm++
    }, ROTATION_TIME);

}

function BusLocationData(res) {
    let indata = [];
    let patten = /<[^>](.*?)>/gi;
    let tempPlainNo = res.match(/\<plainNo>.+?\<rtDist>/g);
    let tempGps = res.match(/\<gpsX>.+?\<isFullFlag>/g);
    for (let i = 0; i < tempPlainNo.length; i++) {
        indata.push(tempPlainNo[i].replace(patten, " ").match(/\s.+?\s/g).concat(tempGps[i].replace(patten, " ").match(/\s.+?\s/g)));
    }

    if (itemSet.length == 0) {
        let offset = 0;
        for (let item of indata) {
            let time = new Date();
            let busNumber = (item[0].replace(/(^\s*)|(\s*$)/g, ''));
            let startTime = time.getFullYear() + '년' + time.getMonth() + '월' + time.getDate() + '일' + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
            itemSet[offset] = (new jsonItemSet(busNumber, startTime));
            offset++;
        }
        offset = null;
    }
    stackBusInfo(indata);
}

function stackBusInfo(busInfo) {

    let offset = 0;
    let date = new Date();
    for (let item of busInfo) {
        let gpsX = Number(item[3].replace(/(^\s*)|(\s*$)/g, ''));
        let gpsY = Number(item[4].replace(/(^\s*)|(\s*$)/g, ''));
        let angle = getAngle(gpsX, gpsY, offset)
        let time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        itemSet[offset].itemArray.push([gpsX, gpsY, angle, time]);
        oldCoorSet[offset] = {
            x: gpsX,
            y: gpsY,
            angle: angle
        };
        offset++;
    }

    if (rotationNm > ROTATION_LIMIT) {
        for(let offset = 0; offset < itemSet.length; offset ++){
            appendFile(itemSet[offset].getJsonData());
            itemSet[offset].flushItemArray();
        }
        rotationNm = 0;
    }
    console.log('rotation:'+rotationNm);
    console.log('InputDataNm : '+itemSet[0].getItemLength());

}


//-------------------------------------------------------

function readLineEventHendler(offset, questionString, hendler) {

    readInterface.setPrompt(questionString);
    readInterface.prompt();
    readInterface.on('line', function (line) {
        let url = urlSet[offset] + (questionString.charAt(0) == 1 ? String(line) : data[Number(line)]);
        doFetch(url, hendler);
    });
}

function appendFile(dataSet) {
    fs.appendFile(String(dataSet.busNumber) + '.json', JSON.stringify(dataSet) + "\r\n", "utf-8", function (error) {
        if (error) throw error;
    });
}
//---------------------------------------------------------

function getAngle(newCoordinateX, newCooordinateY, offset) {
    if (oldCoorSet[offset] === undefined)
        return null;
    ''
    let angleFordegrees = Math.atan2(newCoordinateX - oldCoorSet[offset].x, newCooordinateY - oldCoorSet[offset].y) * 180 / Math.PI;
    if (angleFordegrees < 0 || angleFordegrees > 360)
        angleFordegrees = getCorrectionValue(angleFordegrees);
    else if (angleFordegrees == 0) {
        if (oldCoorSet[offset].angle === null)
            return 0;
        else
            return oldCoorSet[offset].angle;
    }
    return angleFordegrees;
}

function getCorrectionValue(angle) {
    let angleValue = Math.abs(angle);
    let rotation = parseInt(angleValue / 360);

    if (rotation < 1)
        return Math.abs(angleValue - 360);
    else
        return Math.abs(angleValue - (360 * rotation));

}