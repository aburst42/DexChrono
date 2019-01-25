import { Auth } from "./auth";
import { Storage } from "./storage";
import { DataConstants } from "../common/constants";
import * as util from "../common/utils";

export function Data() {
}

// The 26 most recent readings today - typically, that's 3 hours
let minutes = 1440;
let maxCount = 26;

let minGraphValue = 40;
let maxGraphValue = 300;

function fetchNewData() {
  return new Promise(function(resolve, reject) {
    Auth
      .sessionId()
      .then(
        (sessionId) => {
          console.log('COMPANION: got sessionId ' + sessionId + ', let\'s get the data...');

          let url =   'https://share1.dexcom.com/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?sessionId=' + sessionId
                    + '&minutes=' + minutes
                    + '&maxCount=' + maxCount;

          fetch(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
          .then((response) => {           
              console.log('COMPANION: response received');

              return response.json();
          })
          .then((data) => {
            console.log('COMPANION: json received');
            logDebugInfo(data, 'new data fetched');

            resolve(data);
          })
          .catch((error) => {
            console.log('COMPANION: fetch error - ' + error);
            reject(error);
          })
        });
  });
}

// Data analysis
Data.getAnalyzedData = function() {
  return new Promise(function(resolve, reject) {
    fetchNewData()
    .then(
      (data) => {
        let result = packageErrorInfo(DataConstants.noData);

        if (   (!!data)
            && (data.length > 0) ) {
          let latestValue = data[0];

          result = 
            packageInfo(
              latestValue.Value,
              getTimestamp(latestValue),
              latestValue.Trend,
              data,
              DataConstants.noError);
        }

        resolve(result);
      })
    .catch(
      (errorInfo) => {
        console.log('COMPANION: error in geting data - ' + errorInfo);

        let result = packageErrorInfo(DataConstants.noData, errorInfo);

        resolve(result);
      }
    );
  });
}
                     
// Utilities                    
function translateTrend(trend) {
  let result = 'no trend';
  
  switch (trend) {
    case 1: { result = 'UPUP!'; break; }
    case 2: { result = 'UpFast'; break; }
    case 3: { result = 'UpSlow'; break; }
    case 4: { result = 'Steady'; break; }
    case 5: { result = 'DownSlow'; break; }
    case 6: { result = 'DownFast'; break; }
    case 7: { result = 'DOWNDOWN!'; break; }
    default: { result = 'no trend'; break;}
  }
  
  return result;
}

function translateError(error) {
  let result = 'no error';
  
  switch(error) {
    case Data.noError: {result = 'no error'; break; }
    case Data.tooOld: { result = 'data too old'; break; }
    case Data.noData: { result = 'no data'; break; }
    default: { result = 'unknown error'; break; }
  }
}

function packageErrorInfo(errorCode, errorMessage) {
  return packageInfo(null, null, null, null, errorCode, errorMessage);
}

function packageInfo(value, timestamp, trendCode, data, errorCode, errorMessage) {
  return {
    'value': value,
    'timestamp': timestamp,
    'trend': trendCode,
    'trendMessage': translateTrend(trendCode),
    'graphData': getGraphData(data),
    'error': errorCode,
    'errorMessage': (!!errorMessage) ? errorMessage : translateError(errorCode)
  }
}

function getTimestamp(value) {
  let result = parseInt(value.WT.substring(6,19));
  
  return result;
}

function getGraphData(data) {
  let result = [];
  
  if ((!!data)
      && (data.length > 0)) {
    let newestTimestamp = getTimestamp(data[0]);
    let oldestTimestamp = getTimestamp(data[data.length - 1]);
     // we add 1 to every interval to avoid the degenerate, single data point divide by 0 issue
    let timeInterval = (newestTimestamp - oldestTimestamp + 1);
    
    let crtDatum = 0;
   
    // we add 1 to every interval to avoid the degenerate, single data point divide by 0 issue
    let valueInterval = (maxGraphValue - minGraphValue + 1);
    
    for (crtDatum = 0; crtDatum < data.length; crtDatum++) {
      let newGraphPoint = {
        "x": (100 - (Math.round((100 * (newestTimestamp - getTimestamp(data[crtDatum]) + 1)) / timeInterval))),
        "y": Math.round((100 * (data[crtDatum].Value - minGraphValue + 1)) / valueInterval)
      }
      
      result.push(newGraphPoint);
    }
  }
  
  return result;
}

function getFormattedTime(date) {
  let result = '';
  
  result = (util.zeroPad(date.getHours()) + ':' + util.zeroPad(date.getMinutes()) + ':' + util.zeroPad(date.getSeconds()));
  
  return result;
}

function logDebugInfo(data, extraMessage) {
  console.log('COMPANION: DEBUG - START');
  console.log('           ' + extraMessage);
  let now = Date.now();
  if (!data) {
    console.log('           no data');
    console.log('           now @ ' + getFormattedTime(new Date(now)));
  } else if (data.length == 0) {
    console.log('           empty data');
    console.log('           now @ ' + getFormattedTime(new Date(now)));
  } else {
    let latestDatum = data[0];
    let latestDatumDatetime = getTimestamp(latestDatum);
    console.log('           data @ ' + getFormattedTime(new Date(latestDatumDatetime)));
    console.log('           now @ ' + getFormattedTime(new Date(now)));
    console.log('           delta ' + ((now - latestDatumDatetime) / 60000).toFixed(1) + ' minutes');
  }
  
  console.log('COMPANION: DEBUG - END');
}