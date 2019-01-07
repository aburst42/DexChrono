import { Storage } from "./storage";
import { settingsStorage } from 'settings';

export function Auth() {
}

Auth.storage = new Storage(
                    Storage.sessionInfoKey, /*storageKey*/
                    1000 * 60 * 60          /*expirationInterval*/); // 1 hour

Auth.sessionId = function() {
  let sessionInfo = Auth.storage.load();
  
  if (!!sessionInfo) {
    console.log('COMPANION: using saved, unexpired session id');
    return Promise.resolve(sessionInfo.sessionId);
  } else {
    console.log('COMPANION: fetching new session id');
    let username = JSON.parse(settingsStorage.getItem('username')).name;
    let password = JSON.parse(settingsStorage.getItem('password')).name;
    
    return new Promise(function(resolve, reject) {
      if ((!!username) && (!!password)) {
        let url = 'https://share1.dexcom.com/ShareWebServices/Services/General/LoginPublisherAccountByName';

        fetch(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              accountName: username,
              applicationId: 'd8665ade-9673-4e27-9ff6-92db4ce13d13',
              password: password 
            })
          }
        )
        .then(function(response) {
          return response.json();
        },
        () => {reject();})
        .then(function(sessionId) {
          Auth.storage.save({'sessionId': sessionId});
          resolve(sessionId);
        },
        () => {reject();})   
      } else { // missing username or password
        reject();
      }
    });    
  }
}