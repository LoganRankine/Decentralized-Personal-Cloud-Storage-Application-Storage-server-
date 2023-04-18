const http = require('http');
const express = require("express");
let fs = require('fs');
let formidable = require('formidable');
const app = express();
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

formidable.PersistentFile.ma

async function UploadToServer(webIPaddress, webPortNumber,result,req){
    return new Promise((resolve, reject) =>{
        let userUploadedFiles = new formidable.IncomingForm({maxFileSize: '100gb'});
      
        userUploadedFiles.parse(req, function (err, fields, files) {
          console.log('File recieved')
          if(files.filetoupload.size != 0)
          {
            let user = fields.username + '/';
            let oldpath = files.filetoupload.filepath;
            let newpath = __dirname + '/UserFolders/' + user + files.filetoupload.originalFilename;
            //check if file exists
            if (!fs.existsSync(newpath)) {
              fs.copyFile(oldpath, newpath, async function (err) {
              if (err) throw err;
              
              //Remove temp file 
              fs.unlink(oldpath,function(err){
                if(err){
                  console.log(err)
                }
              })

              fields;

              //get file type
              let mimetype = files.filetoupload.mimetype
              let split = mimetype.split('/')
              let int = split.length - 1
              let filetype = split[int]

              console.log('file stored', files.filetoupload.originalFilename)
              //send request to web server to add user file information to MySQL server
              await sendUpload(fields.username,files.filetoupload.originalFilename,filetype,webIPaddress,webPortNumber)
              console.log("file stored", files.filetoupload.originalFilename)
              resolve()
              });
            } 
            //change filename as it exists already
            else{
              console.log('file exists')

              //Get random number
              let randomNum = Math.floor(Math.random() * 9999);

              //Add random number to filename so same file can be uploaded, just different file name
              let newfilename = randomNum + '_' +files.filetoupload.originalFilename

              let newfilenamepath = __dirname + '/UserFolders/' + user + newfilename;

              fs.copyFile(oldpath, newfilenamepath, async function (err) {

                if (err) throw err;
              
              //Remove temp file 
              fs.unlink(oldpath,function(err){
                if(err){
                  console.log(err)
                }
              })

              //get file type
              let mimetype = files.filetoupload.mimetype
              let split = mimetype.split('/')
              let int = split.length - 1
              let filetype = split[int]

              //send request to web server to add user file information to MySQL server
              await sendUpload(fields.username,newfilename,filetype,webIPaddress,webPortNumber)
              console.log("file stored", newfilename)
              resolve()
              })
            }           
          }
          else{
            result.redirect('http://' + webIPaddress +':' + webPortNumber + '/AccountPage');
            console.log('No file sent')
          }
      });
    })
}

async function sendUpload(p_username,p_filename,p_filetype,webIPaddress,webPortNumber){
    return new Promise((resolve, reject) =>{
    //get current data 
    let date = new Date();
  
    let time = date.toLocaleTimeString()
    let days = date.toLocaleDateString()
  
    let splitted = days.split('/')
    let day = splitted[0]
    let month = splitted[1]
    let year = splitted[2]
  
    let dateuploaded = day + '-' + month + '-' + year + " " + time
  
    let sendFileInfomation = JSON.stringify({
      'user': p_username,
      'filename': p_filename,
      'dateuploaded': dateuploaded,
      filetype: p_filetype
    });
  
    let sendFileInfoOptions = {
      hostname: webIPaddress,
      path: '/dateUploaded',
      port: webPortNumber,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(sendFileInfomation)
      }
    }
    //Requests from storage server all files stored in a users folder
  let sendFileInfoReq = http.request(sendFileInfoOptions, (res) => {
    let response = ''
     
    //Gets the chunked data recieved from storage server
    res.on('data', (chunk) => {
      response += chunk;
    });
    
    //Ending the response 
    res.on('end', () => {
      //Ends the stream of data once it reaches an end
      sendFileInfoReq.end()
      resolve()
    });
  }).on("error", (err) => {
    console.log("Error: ", err)
    //Sends username to storage server to be used to get the correct users directory information
  }).end(sendFileInfomation)
    })
    
  }

module.exports = {UploadToServer}