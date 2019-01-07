import { Auth } from "./auth";
import { Storage } from "./storage";
import { DataConstants } from "../common/constants";

export function Data() {
}

// The 26 most recent readings today - typically, that's 3 hours
let minutes = 1440;
let maxCount = 26;

let minGraphValue = 40;
let maxGraphValue = 300;

// Data shown should be at most 60 minutes old
let requiredDataRecencyInterval = 1000 * 60 * 60;

Data.storage = new Storage(
                    Storage.cgmDataKey,         /*storageKey*/
                    requiredDataRecencyInterval /*expirationInterval*/);

Data.clearCache = function() {
  Data.storage.clear();
}

function fetchNewData(resolve, reject) {
  Auth
    .sessionId()
    .then(
      (sessionId) => {
        console.log('COMPANION: got sessionId, let\'s get the data...');

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
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          Data.storage.save(data);

          resolve(data);
        })
      });
}
// Raw data fetching
Data.getLatest = function() {
  let cgmData = Data.storage.load();
  
  if (   (!!cgmData)
      && (cgmData.length > 0)
      && (cgmData[0])) {
    return new Promise(function(resolve, reject) {
      console.log('COMPANION: sending cgmData - ' + JSON.stringify(cgmData));
      
      resolve(cgmData);
      
//      if (!isSufficientlyRecent(getTimestamp(cgmData[0]))) {
        console.log('COMPANION: sent data to app, now fetching new data.');
        fetchNewData(resolve, reject);
//      }
    });
  } else {
    return new Promise(function(resolve, reject) {
      console.log('COMPANION: no data, fetching new data.');

      fetchNewData(resolve, reject);
    });
  }
}

// Data analysis
Data.getAnalyzedData = function() {
  return new Promise(function(resolve, reject) {
    Data
      .getLatest()
      .then(
        (data) => {
          let result = packageErrorInfo(DataConstants.noData);

          if (   (!!data)
              && (data.length > 0) ) {
            let latestValue = data[0];
            if (isSufficientlyRecent(getTimestamp(latestValue))) {
              result = 
                packageInfo(
                  latestValue.Value,
                  getTimestamp(latestValue),
                  latestValue.Trend,
                  data,
                  DataConstants.noError);
            } else {
              result = packageErrorInfo(DataConstants.tooOld);
            }
          }

          resolve(result);
        })
  });
}
                     
// Utilities                    
function isSufficientlyRecent(dataTimestamp) {
  let result = false;
    
  if (   (!!dataTimestamp)
      && ((Date.now() - dataTimestamp) <= requiredDataRecencyInterval)) {
    result = true;
  }
  
  return result;
}

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

function packageErrorInfo(errorCode) {
  return packageInfo(null, null, null, null, errorCode);
}

function packageInfo(value, timestamp, trendCode, data, errorCode) {
  return {
    'value': value,
    'timestamp': timestamp,
    'trend': trendCode,
    'trendMessage': translateTrend(trendCode),
    'graphData': getGraphData(data),
    'error': errorCode,
    'errorMessage': translateError(errorCode)
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
   
    /*
    // Dynamic range computation - static values seem to work better...
    let minValue = data[0].Value;
    let maxValue = data[0].Value;
    
    for (crtDatum = 1; crtDatum < data.length; crtDatum++) {
      let crtValue = data[crtDatum].Value;
      if (crtValue < minValue) {
        minValue = crtValue;
      } else if (crtValue > maxValue) {
        maxValue = crtValue;
      }
    }
    */
    
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