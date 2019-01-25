import * as messaging from "messaging";
import { settingsStorage} from "settings";
import { me } from "companion";
import { encode } from "cbor";
import { outbox } from "file-transfer";

import { Data } from "./data";
import { DataConstants } from "../common/constants";

me.wakeInterval = 300000; // wake up 5 minutes

me.onwakeinterval = () => {
  console.log('COMPANION: wake up');
  
  cacheCGMData();
}

messaging.peerSocket.onopen = () => {
  console.log("COMPANION: socket open");
  cacheCGMData();
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
    case 'updateCGM': { cacheCGMData(); break; }
    default: { console.log('COMPANION: unknown command'); break; }
  }
}

settingsStorage.onchange = function(evt) {
  Data.clearCache();
  cacheCGMData();
}

function handleNewData(data) {
  let newData = JSON.stringify(data);
  console.log("COMPANION: new data " + newData);

  sendDataToDeviceFile(newData);
}

function sendDataToDeviceFile(data) {
  let encodedData = encode(data);
  let transferFilename = DataConstants.transferFilename;
  
  outbox
    .enqueue(transferFilename, encodedData)
    .then(ft => {
      console.log(`COMPANION: Transfer of '${transferFilename}' successfully queued.`);
    })
    .catch(function (error) {
      throw new Error(`Failed to enqueue '${destFilename}'. Error: ${error}`);
    });
}

function cacheCGMData() {
  console.log('COMPANION: fetchAndSendCGMData');

  Data
    .getAnalyzedData(true /*cacheOnly*/)
    .then(handleNewData);
}