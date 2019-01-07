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

function fetchAndSendCGMData() {
  console.log('COMPANION: fetchAndSendCGMData');
  
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // If we're connected, fetch the data and send it to the app...
    Data
      .getAnalyzedData()
      .then(
        (data) => {
          messaging.peerSocket.send(JSON.stringify(data));
        })
      .catch(
        (rejectionData) => {
          console.log("error in fetching data - " + rejectionData);
          messaging.peerSocket.send(JSON.stringify(rejectionData));
        });
  } else {
    // ...otherwise, just fetch the data, so that it is cached for later...
    Data.getAnalyzedData();
  }
}