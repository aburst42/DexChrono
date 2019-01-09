import * as messaging from "messaging";
import { Data } from "./data";
import { settingsStorage} from "settings";
import { me } from "companion";

me.wakeInterval = 300000; // wake up 5 minutes

me.onwakeinterval = () => {
  console.log('COMPANION: wake up');
  
  fetchAndSendCGMData();
}

messaging.peerSocket.onopen = () => {
  console.log("COMPANION: socket open");
  fetchAndSendCGMData();
}

messaging.peerSocket.onclose = () => {
  console.log("COMPANION: socket closed");
};

messaging.peerSocket.onerror = (err) => {
  console.log(`COMPANION: socket error - ${err.code}:${err.message}`);
}

messaging.peerSocket.onmessage = (evt) => {
  console.log(`COMPANION: received data - ${evt.data}`);
  
  switch (evt.data) {
    case 'updateCGM': { fetchAndSendCGMData(); break; }
    default: { console.log('COMPANION: unknown command'); break; }
  }
}

settingsStorage.onchange = function(evt) {
  Data.clearCache();
  fetchAndSendCGMData();
}

function handleNewData(data) {
  console.log("COMPANION: new data " + JSON.stringify(data));

  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(JSON.stringify(data));
  }
}

function handleError(rejectionData) {
  console.log("COMPANION: error in fetching data - " + rejectionData);
  
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(rejectionData);
  }
}

function fetchAndSendCGMData() {
  console.log('COMPANION: fetchAndSendCGMData');

  // Promises can only be resolved once. If we could resolve more than once
  // (and ensure that then gets called again), or if promises had a 'progress'
  // callback, we could instead hide the complexity behind getAnalyzedData.
  // Instead, we have to use the two step pattern below
  
  // First, we return data cached in memory, if available, right away
  Data
    .getAnalyzedData(true /*cacheOnly*/)
    .then(handleNewData);
  
  // Next, we cue up a (possibly) long running operation to fetch
  // fresh data from the service.
  Data
    .getAnalyzedData(false /*cacheOnly*/)
    .then(handleNewData);
}