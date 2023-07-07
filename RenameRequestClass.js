const fs = require('fs')
const http = require('http')
const file = require("./Server_configuration.json");
const crypto = require("crypto");

const FileServerIP = file.FileServerIP;
const FileServerPort = file.FileServerPort;
const webServerIP = file.WebServerIP;
const webServerPort = file.WebServerPort;

async function RenameFile(req){
    let sessionID = req.query["sessionID"]
    let fileID = req.query["fileid"]

    let NewFilename = req.body.newFilename 

    await updateDB(sessionID,fileID, NewFilename)

}

async function updateDB(sessionID,fileID, NewFilename){
  
  return new Promise((resolve, reject) => {
    //Turns username into a JOSN object 
    let renamerequest = JSON.stringify({
      'fileid': fileID,
      'newFilename' : NewFilename,
    });
  
    // Request to rename file on database
    let options = {
      hostname: webServerIP,
      port: webServerPort,
      path: `/rename?sessionID=${sessionID}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': renamerequest.length
      }
    }
  
    //Send request to storage server 
    let createNewDirectory = http.request(options, async (res) => {  
      // Ending the response 
      res.on('OK', () => {
        createNewDirectory.end()
        resolve()
        console.log('renamed file on sql database')
      });    
    }).on("error", (err) => {
      console.log("Error: ", err)
    }).end(renamerequest)
  })
}
module.exports ={RenameFile}