const http = require("http");
const file = require("./Server_configuration.json");
const webIPaddress = file.WebServerIP;
const webPortNumber = file.WebServerPort;

async function deleteFile(req, res){
  //Get variables from query
  let sessionID = req.query["sessionID"]
  let fileID = req.query["fileid"]

  //Request to delete from database using data from query
  //Returns filetoken and user directory
  let fileToken = await deleteOnDB(sessionID,fileID)
  console.log(fileToken)

  //Ensure file token is recieved
  fileToken = JSON.parse(fileToken)
  res.send(fileToken)
  return
  
  
}

async function deleteOnDB(sessionID, fileID){
    return new Promise(async (resolve, reject) =>{
        //Request to delete file from SQL database
        let deletedb = new URL(`http://${webIPaddress}:${webPortNumber}/delete?sessionID=${sessionID}&fileid=${fileID}`)
        
        //Requests to delete file information
        let deletedbRequest = await fetch(deletedb, {method: 'DELETE'})
        let deleteResponse = await deletedbRequest.json()
        console.log(deleteResponse)
        resolve(deleteResponse)
        
    }) 
}

module.exports = {deleteFile}