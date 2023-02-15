const express = require('express');
const sharp = require('sharp');
const app = express();
let fs = require('fs');
let formidable = require('formidable');
const http = require('http');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('viewengine', 'ejs');

//Read configure file before server start
let server_configuration = fs.readFileSync('server_config.txt')

server_configuration = server_configuration.toString()

const server_configuration_settings = server_configuration.split('\r\n')

//Port number and IP address
const port_number = server_configuration_settings[2].split(':')[1];
const host_IP = server_configuration_settings[1].split(':')[1];
const webPortNumber = 3000
const webIPaddress = 'localhost'


let requestsAllowed = false;
app.get('/', async (req,res)=>{
    await res.render('set_up.ejs', {IPaddress:host_IP,PortNumber: port_number});
})

app.get('/change-settings.html', async (req,res)=>{
  res.sendFile(__dirname + '/change-settings.html')
})

app.post('/configure', async (req,res)=>{
  console.log('configuring server')
  
  //Gets the user inputs from web form
  let startUP = 'firstStart:' + server_configuration_settings[0].split(':')[1];
  let ip = 'host:' + req.body.IP;
  let port = 'port:' + req.body.portNumber

  //Put inputted values into a string to append to server config file
  let add = startUP + '\r\n' + ip + '\r\n' + port

  fs.writeFileSync('server_config.txt', add, function(err){
    if(err) console.log(err)
    console.log('New settings added to server config file');
  });
  res.send('Restart server to apply settings.')
})

//Create user directory
app.post('/CreateUserDirectory', async (req,res)=>{
     //Create directory where user files stored
     let user = req.body.user;
     let userDirectory = __dirname + "/UserFolders/" + user;
    try {
        if (!fs.existsSync(userDirectory)) {
        fs.mkdirSync(userDirectory);
        console.log("Created user folder:", user)
        let response = {CreatedDirectory: userDirectory}
        res.send(response)
        }
    } catch (err) {
        console.error(err);
        res.send(err)
    }
})

let file
//Get user directory
app.post('/getUserDirectory', async (req,res)=>{
    let myPromise = new Promise(function (resolve) {
    let username = req.body.user;
    let userDir = __dirname + '/UserFolders/' + username
     console.log(userDir)
     fs.readdir(userDir, (error, files) => {
        if (error) console.log(error)
        files.forEach(file => console.log(file))
        if (files != undefined) {
        files = JSON.stringify({
          'userDir': files
        })
        resolve(files);
        res.send(files)
        }
        else{
          res.send(undefined)
        }
      })
      });

      file = await myPromise.then()

})

//Sign into server and allow request
app.get('/allowRequests',async(req,res)=>{
    if(requestsAllowed == true){
        requestsAllowed = false;
        res.send('requests wont be accepted')
        console.log('requests wont be accepted')
    }
    requestsAllowed = true;
    console.log('requests will now be accepted')
    //res.send('requests will now be accepted')
    res.send('requests will now be accepted')
})

//uploads image to user file directory
app.post('/upload',async (req,result)=>{
    let userUploadedFiles = new formidable.IncomingForm();
    userUploadedFiles.parse(req, function (err, fields, files) {
    let user = fields.username + '/';
    let oldpath = files.filetoupload.filepath;
    let newpath = __dirname + '/UserFolders/' + user + files.filetoupload.originalFilename;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      fields;
      //send request to web server to add user file information 
      sendUpload(fields.username,files.filetoupload.originalFilename)

      result.redirect('http://' + webIPaddress +':' + webPortNumber + '/accountmain-page/accountmain.html');
      console.log('file stored', files.filetoupload.originalFilename)
    });
  });
  
})

async function sendUpload(p_username,p_filename){

  //get current data 
  let date = new Date();

  let time = date.toLocaleTimeString()
  let days = date.toLocaleDateString()


  let splitted = days.split('/')
  let day = splitted[0]
  let month = splitted[1]
  let year = splitted[2]

  let dateuploaded = year + '-' + month + '-' + day + " " + time

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

    //JSON parse the data recieved so it can be read
    console.log('Body:', JSON.parse(response))

  });
}).on("error", (err) => {
  console.log("Error: ", err)
  //Sends username to storage server to be used to get the correct users directory information
}).end(sendFileInfomation)
  
}

//Sends requested file to webpage
app.all('*', async(req,res)=>{
    if(requestsAllowed){
        //get which user is requesting the image
        let user = req.url.toString().split('/')
        let currentUser = user[1];
        let fileRequested = user[2];
        if(req.url.toString().includes(currentUser)){
            
            let newFileLocation = 'C:/Users/logan/source/repos/Decentralized-Personal-Cloud-Storage-Application-Storage-server-/UserFolders/' 
            + currentUser + '/' + fileRequested

            /*
            awaitsharp(newFileLocation).resize(200,200,{
              fit: sharp.fit.contain
            }).toFile('temp.jpg');
            
            res.sendFile(__dirname + '/temp.jpg');
            */

            res.sendFile(newFileLocation);

            console.log("image requested:", newFileLocation)
        }
    }
    else{
        res.send("404 not found")
      }
})

app.listen(port_number,host_IP, () => {
  console.log('Storage server is running on IP address:', host_IP +',','Port number:',port_number);
});