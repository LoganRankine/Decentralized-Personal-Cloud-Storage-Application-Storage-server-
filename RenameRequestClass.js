const fs = require('fs')
const http = require('http')

async function RenameFile(reqBody, p_file, username, webServerIP, webServerPort){
  //Get the files that are stored with user
  let userFiles = p_file

  //Get values from req 
  let user = reqBody.user
  let file = reqBody.file
  let rename = reqBody.rename

  const oldpath = __dirname + '/UserFolders/' + username + '/' + userFiles.filename
  const newpath = __dirname + '/UserFolders/' + username + '/' + rename + '.' + userFiles.filetype
  const newName = rename + '.' + userFiles.filetype

  fs.rename(oldpath,newpath, async (err)=>{
    if (err) throw err;
    await updateDB(userFiles.FileID, newName,webServerIP, webServerPort, user)
    console.log('File renamed')
  })

}

async function updateDB(fileid,rename,webServerIP, webServerPort, user){
  return new Promise((resolve, reject) => {
    //Turns username into a JOSN object 
    let renamerequest = JSON.stringify({
      'fileid': fileid,
      'name' : rename,
      'user' : user
    });
  
    // options to send to storage server and puts username in header so server knows what to 
    //call the new directory
    let options = {
      hostname: webServerIP,
      port: webServerPort,
      path: '/rename',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': renamerequest.length
      }
    }
  
    //Sends request to storage server 
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