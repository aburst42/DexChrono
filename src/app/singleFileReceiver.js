import * as fs from "fs";
import { inbox } from "file-transfer";

export class SingleFileReceiver {
  constructor(filename, handler) {
    this._incomingFilename = filename;
    this._handler = handler;
    
    inbox.addEventListener('newfile', this.processIncomingFiles);
    
    console.log(`DEVICE: SingleFileReceiver set up for file - ${this._incomingFilename}`);    
  }
  
  processIncomingFiles = () => {
    let filename;

    console.log('DEVICE: SingleFileReceiver incoming file notification');
    
    while (filename = inbox.nextFile()) {
      if (filename == this._incomingFilename) {
        console.log(`DEVICE: received new '${filename}' file`);
        let data = fs.readFileSync(`/private/data/${filename}`, 'cbor');
        
        console.log(`DEVICE: file contents - ${data}`);
        
        this._handler(data);
      }
    }
  }
}