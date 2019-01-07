import { localStorage as storage } from "local-storage";

//Storage
export function Storage(storageKey, expirationInterval) {
  this.storageKey = storageKey;
  this.expirationInterval = expirationInterval;
}

Storage.sessionInfoKey = "sessionInfoKey";
Storage.cgmDataKey = "cgmDataKey";

Storage.prototype.clear = function() {
  console.log('COMPANION: clear storage');
  storage.clear();
}

Storage.prototype.load = function() {
  let result = null;
  
  //console.log('COMPANION: load ' + this.storageKey);

  let rawData = storage.getItem(this.storageKey);
  
  //console.log('COMPANION: loaded ' + rawData);
  
  if (!!rawData) {
    let data = JSON.parse(rawData);
    if (!!data) {
      if (!isExpired(data.Timestamp, this.expirationInterval)) {
        console.log('COMPANION: ' + this.storageKey + ': fresh');
        result = JSON.parse(data.Value);
      } else {
        console.log('COMPANION: ' + this.storageKey + ': expired');
      }
    }
  }

  return result;
}

Storage.prototype.save = function(data) {
  storage.setItem(
    this.storageKey,
    JSON.stringify({
      Value     : JSON.stringify(data),
      Timestamp : Date.now()
    }));
}

function isExpired(savedDataTimestamp, expirationInterval) {
  let result = true;
  
  if (   (!!savedDataTimestamp)
      && ((Date.now() - savedDataTimestamp) < expirationInterval)) {
    result = false;
  }
  
  return result;
}