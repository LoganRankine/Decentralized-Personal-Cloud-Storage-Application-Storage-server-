const http = require('http');
let fs = require('fs');
let formidable = require('formidable');

async function UploadToServer(webIPaddress, webPortNumber,result,req){
    return new Promise((resolve, reject) =>{
        let userUploadedFiles = new formidable.IncomingForm();
        userUploadedFiles.parse(req, function (err, fields, files) {
          console.log('File recieved')
          if(files.filetoupload.size != 0)
          {
            let user = fields.username + '/';
            let oldpath = files.filetoupload.filepath;
            let newpath = __dirname + '/UserFolders/' + user + files.filetoupload.originalFilename;
            //check if file exists
            if (!fs.existsSync(newpath)) {
              fs.rename(oldpath, newpath, async function (err) {
              if (err) throw err;
              fields;
    
              //send request to web server to add user file information to MySQL server
              await sendUpload(fields.username,files.filetoupload.originalFilename)
              resolve()
        
              result.redirect('http://' + webIPaddress +':' + webPortNumber + '/accountmain-page/accountmain.html');
              console.log('file stored', files.filetoupload.originalFilename)
              });
            }
            //change file name
            else{
              let type = '.' + newpath.slice(-3)
              let file = newpath.replace(type,'');
              let newpathcreated = file + '(1)' + type
              let newFilename = files.filetoupload.originalFilename.replace(type, '(1)' + type)
              fs.rename(oldpath, newpathcreated, async function (err) {
                if (err) throw err;
                fields;
                //send request to web server to add user file information 
                await sendUpload(fields.username,newFilename, webIPaddress,webPortNumber).then(()=>{
                    resolve()
                    result.redirect('http://' + webIPaddress +':' + webPortNumber + '/accountmain-page/accountmain.html');
                    console.log('file stored', files.filetoupload.originalFilename)
                })            
                });
            }
            
          }
          else{
            result.redirect('http://' + webIPaddress +':' + webPortNumber + '/accountmain-page/accountmain.html');
            console.log('No file sent')
          }
      });
    })
}

async function sendUpload(p_username,p_filename, webIPaddress,webPortNumber){
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
      'dateuploaded': dateuploaded
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
        resolve(JSON.parse(response))
      //JSON parse the data recieved so it can be read
      console.log('Body:', JSON.parse(response))
  
    });
  }).on("error", (err) => {
    console.log("Error: ", err)
    //Sends username to storage server to be used to get the correct users directory information
  }).end(sendFileInfomation)
    })
    
  }

module.exports = {UploadToServer}