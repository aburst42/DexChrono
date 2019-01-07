import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { DataConstants } from "../common/constants";

// Update the clock every minute
clock.granularity = "minutes";

const firstLine = document.getElementById("firstLine");
const secondLine = document.getElementById("secondLine");
const thirdLine = document.getElementById("thirdLine");

let maxGraphPoints = 26;
const cgmGraphPoints = [];
for (let crtGraphPoint = 0; crtGraphPoint < maxGraphPoints; crtGraphPoint++) {
  cgmGraphPoints.push(document.getElementById("CGM-dp" + crtGraphPoint.toString()));
}

let graphWidth = 300;
let graphHeight = 200;

let unknownTrend = 0;
let unknownValue = -1;

let inEmergency = false;

const noData = 'No Data';

// Rendering
function getFormattedTime(date) {
  let result = `${util.zeroPad((date.getHours() % 12) || 12)}:${util.zeroPad(date.getMinutes())}`;
  return result;
}

let trendStrings = [
  'going UP, VERY FAST!',
  'going UP, FAST',
  'going UP',
  'steady',
  'going DOWN',
  'going DOWN, FAST',
  'going DOWN, VERY FAST!'
];

function getTrendString(trend) {
  return trendStrings[trend];
}

function renderTime() {
  firstLine.text = `It is now ${getFormattedTime(new Date())}.`;
}

function renderCGM(cgmParams) {
  secondLine.text = `At ${getFormattedTime(new Date(cgmParams.timestamp))}, the reading was:`;
  thirdLine.text = `  ${cgmParams.value.toString()}mg/dl, ${getTrendString(cgmParams.trend)}`;
}

function renderCGMGraph(cgmGraphParams) {
  for (let crtPoint=0; crtPoint < cgmGraphParams.length; crtPoint++) {
    let cgmGraphParam = cgmGraphParams[crtPoint];
    if (cgmGraphParam.visible) {
      cgmGraphPoints[crtPoint].style.visibility = "visible";
      cgmGraphPoints[crtPoint].cx = cgmGraphParam.cx;
      cgmGraphPoints[crtPoint].cy = cgmGraphParam.cy;
      cgmGraphPoints[crtPoint].style.fill = cgmGraphParam.fill;
    } else {
      cgmGraphPoints[crtPoint].style.visibility = "hidden";
    }
  }
}
// /Rendering


// ViewModel
clock.ontick = ((evt) => {
  console.log('DEVICE: app tick');
  
  requestCGMData();
  renderTime();
});


function requestCGMData() {
  console.log('DEVICE: sending CGM request');

  sendMessageToCompanion('updateCGM');
};

function updateLatestCGM(value, timestamp, trend) {
  let cgmParams = {
    'value': value,
    'timestamp': timestamp,
    'trend': trend,
  }
  
  renderCGM(cgmParams);
}

function updateCGMGraph(graphData) {
  let cgmGraphParams = [];
  
  let graphDataPointCount = (!!graphData) ? graphData.length : 0;
  for (let crtDatum = 0; crtDatum < maxGraphPoints; crtDatum++) {
    if (crtDatum < graphDataPointCount) {
      cgmGraphParams.push({
        "visible": true,
        "cx": Math.round(graphData[crtDatum].x * graphWidth / 100),
        "cy": (graphHeight - Math.round(graphData[crtDatum].y * graphHeight / 100)),
        "fill": (inEmergency ? emergencyColor : "white")
      });
    } else {
      cgmGraphParams.push({"visible": false})
    }
  }
  
  renderCGMGraph(cgmGraphParams);
}

function updateCGMInfo(payload) {  
  if (!payload) {
    // No payload - unknown error
    updateLatestCGM(unknownValue, null, unknownTrend);
    updateCGMGraph([]);
  } else if (payload.error != DataConstants.noError) {
    // Companion returned an error
    console.log("DEVICE: error - " + payload.error);
    
    updateLatestCGM(payload.error, new Date(), unknownTrend);
    updateCGMGraph([]);
  } else {
    // All is good, render
    updateLatestCGM(payload.value, payload.timestamp, payload.trend);
    updateCGMGraph(payload.graphData);
  }
}      
// /ViewModel

//Messaging
// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("DEVICE: socket opened");
  
  // Eventually results in a call to updateCGMInfo
  requestCGMData();
}

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("DEVICE: socket closed");
}

messaging.peerSocket.onmessage = evt => {
  console.log(`DEVICE: app received ${evt.data}`);

  let payload = JSON.parse(evt.data);
  
  updateCGMInfo(payload);
}

function sendMessageToCompanion(message) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(message);
  }
}
// /Messaging