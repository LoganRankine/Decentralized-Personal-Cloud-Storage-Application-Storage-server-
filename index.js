//Module imports from node/js library 
const express = require("express");
const sharp = require("sharp");
const app = express();
let fs = require("fs");
let formidable = require("formidable");
const http = require("http");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const zlib = require("zlib");
const cors = require('cors')
const file = require("./Server_configuration.json")

//Created classes
const uploadClass = require("./UploadClass");
const deleteClass = require('./DeleteRequestClass')
const renameClass = require('./RenameRequestClass')
const tokenClass = require('./TokenGenClass')

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("viewengine", "ejs");

let UserFiles = [];

//Port number and IP address
let port_number = file.FileServerPort
let host_IP = file.FileServerIP
let webPortNumber = file.WebServerPort
let webIPaddress = file.WebServerIP

app.use(cors({origin: 'http://' + webIPaddress + ':' + webPortNumber, exposedHeaders: 'application/json'}))

//Need to create Object to store User files
let requestsAllowed = false;
app.get("/", async (req, res) => {
  await res.render("set_up.ejs", {
    IPaddress: file.FileServerIP,
    PortNumber: file.FileServerPort,
  });
});

app.get("/change-settings.html", async (req, res) => {
  res.sendFile(__dirname + "/change-settings.html");
});

app.post("/configure", async (req, res) => {
  console.log("configuring server");

  //Gets the user inputs from web form
  file.FirstStart = false;
  file.FileServerIP = req.body.IP;
  file.FileServerPort = req.body.portNumber;

  let newjson = JSON.stringify(file)

  fs.writeFile(__dirname + "Server_configuration.json",newjson,function(err){
    if(err){
      console.log(err)
    }
    console.log("Saved confige")
    res.send("Restart server!")
    process.exit()
  })
});

//Create user directory
app.post("/CreateUserDirectory", async (req, res) => {
  //Create directory where user files stored
  let user = req.body.user;
  let userDirectory = __dirname + "/UserFolders/" + user;
  try {
    if (!fs.existsSync(userDirectory)) {
      fs.mkdirSync(userDirectory);
      console.log("Created user folder:", user);
      let response = { CreatedDirectory: userDirectory };
      res.send(response);
    }
  } catch (err) {
    console.error(err);
    res.send(err);
  }
});

//Sign into server and allow request
app.get("/allowRequests", async (req, res) => {
  if (requestsAllowed == true) {
    requestsAllowed = false;
    res.send("requests wont be accepted");
    console.log("requests wont be accepted");
  }
  requestsAllowed = true;
  console.log("requests will now be accepted");
  //res.send('requests will now be accepted')
  res.send("requests will now be accepted");
});

//uploads image to user file directory
app.post("/upload", async (req, result) => {
  //await uploadClass.UploadToServer(webIPaddress,webPortNumber,result,req)

  let userUploadedFiles = new formidable.IncomingForm();
  userUploadedFiles.parse(req, function (err, fields, files) {
    console.log("File recieved at:",Date.now().toString());
    if (files.filetoupload.size != 0) {
      let user = fields.username + "/";
      let oldpath = files.filetoupload.filepath;
      let newpath =
        __dirname +
        "/UserFolders/" +
        user +
        files.filetoupload.originalFilename;
      //check if file exists
      if (!fs.existsSync(newpath)) {
        fs.rename(oldpath, newpath, function (err) {
          if (err) throw err;
          fields;

          //get file type
          let mimetype = files.filetoupload.mimetype
          let split = mimetype.split('/')
          let int = split.length - 1
          let filetype = split[int]

          //send request to web server to add user file information to MySQL server
          sendUpload(fields.username, files.filetoupload.originalFilename, filetype);
          console.log('File:',files.filetoupload.originalFilename, 'upload, from user:', fields.username, 'at' + Date.now().toString())
          result.redirect(
            "http://" +
              webIPaddress +
              ":" +
              webPortNumber +
              "/accountmain-page/accountmain.html"
          );
          console.log("file stored", files.filetoupload.originalFilename, 'at:', Date.now().toString());
        });
      }
      //change file name
      else {
        let type = "." + newpath.slice(-3);
        let file = newpath.replace(type, "");
        let newpathcreated = file + "(1)" + type;
        let newFilename = files.filetoupload.originalFilename.replace(
          type,
          "(1)" + type
        );
        fs.rename(oldpath, newpathcreated, function (err) {
          if (err) throw err;
          fields;
          //send request to web server to add user file information
          sendUpload(fields.username, newFilename);

          result.redirect(
            "http://" +
              webIPaddress +
              ":" +
              webPortNumber +
              "/accountmain-page/accountmain.html"
          );
          console.log("file stored:", files.filetoupload.originalFilename, 'at:', Date.now().toString());
        });
      }
    } else {
      result.redirect(
        "http://" +
          webIPaddress +
          ":" +
          webPortNumber +
          "/accountmain-page/accountmain.html"
      );
      console.log("No file sent");
    }
  });
});

//Rename file recieved
app.put('/rename/*', async(req,res)=>{
  console.log(req.body)

  try{
    //Find if user exists
    UserFiles.forEach(async user=>{
    //Match session ID on server to one provided
    if(user.User.SessionID == req.body.user){
      var userFiles = user
      userFiles.Files.forEach(async(file) => {
        //Once user found, match the file tokens to the one provided in url
        if(file.token == req.body.file){
          //Rename file
          await renameClass.RenameFile(req.body, file, userFiles.User.UserName, webIPaddress,webPortNumber)
          res.send('OK')
        }
      })
    }
  })
  } catch(err){
    console.log(err)
    res.send('404')
  }  
})

app.post("/FileTokens", async (req, res) => {

  const user = req.body.UserInfo;
  const userFiles = req.body.UserFiles;

  console.log(user.UserName,"request for file tokens");

  UserFiles.push(await tokenClass.CreateFileTokens(res,user,userFiles))

  console.log('File tokens created for user:',user)
});

async function sendUpload(p_username, p_filename, p_filetype) {
  //get current data
  let date = new Date();

  let time = date.toLocaleTimeString();
  let days = date.toLocaleDateString();

  let splitted = days.split("/");
  let day = splitted[0];
  let month = splitted[1];
  let year = splitted[2];

  let dateuploaded = day + "-" + month + "-" + year + " " + time;

  let sendFileInfomation = JSON.stringify({
    user: p_username,
    filename: p_filename,
    dateuploaded: dateuploaded,
    filetype: p_filetype

  });

  let sendFileInfoOptions = {
    hostname: webIPaddress,
    path: "/dateUploaded",
    port: webPortNumber,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(sendFileInfomation),
    },
  };
  //Requests from storage server all files stored in a users folder
  let sendFileInfoReq = http
    .request(sendFileInfoOptions, (res) => {
      let response = "";

      //Gets the chunked data recieved from storage server
      res.on("data", (chunk) => {
        response += chunk;
      });

      //Ending the response
      res.on("end", () => {
        //Ends the stream of data once it reaches an end
        sendFileInfoReq.end();
        console.log('Sent file info to database:',p_filename)
        //JSON parse the data recieved so it can be read
        console.log("Body:", JSON.parse(response));
      });
    })
    .on("error", (err) => {
      console.log("Error: ", err);
      //Sends username to storage server to be used to get the correct users directory information
    })
    .end(sendFileInfomation);
}

async function GenerateToken(p_userFile) {
  //Generate random string to be used as token to access file
  const newUserToken = crypto.randomBytes(20).toString("base64url");
  const temp = p_userFile;

  const user = {
    filename: temp.filename,
    dateuploaded: temp.dateuploaded,
    filetype: temp.filetype,
    FileID: temp.FileID,
    token: newUserToken,
  };

  return user;
}

//Download/ Preview file
app.get("/preview/*", async (req,res) =>{
  console.log('preview request')

   // find user requesting
   const url = req.url.toString();
   const userRequest = url.split("/")[2];
   const fileRequest = url.split("/")[3];
 
   let userFiles;
   let filename;
   UserFiles.forEach((element) => {
    
     if (element.User.SessionID == userRequest) {
      userFiles = element
       userFiles.Files.forEach((file) => {
        if (file.token == fileRequest) {
          filename = file;

          let newFileLocation = __dirname + "/UserFolders/" +
            userFiles.User.UserName + "/" + filename.filename;

          res.header("Access-Control-Allow-Origin",'http://' + webIPaddress + ':' + webPortNumber)
          res.sendFile(newFileLocation);
          console.log('file previewed:', filename.filename)
        }
      });
     }
 
   })

})

app.get("/download/*", async (req,res) =>{
  console.log('download request')

   // find user requesting
   const url = req.url.toString();
   const userRequest = url.split("/")[2];
   const fileRequest = url.split("/")[3];
 
   let userFiles;
   let filename;
   UserFiles.forEach((element) => {
    
     if (element.User.SessionID == userRequest) {
      userFiles = element
       userFiles.Files.forEach((file) => {
        if (file.token == fileRequest) {
          filename = file;

          let newFileLocation = __dirname + "/UserFolders/" +
            userFiles.User.UserName + "/" + filename.filename;

          res.header("Access-Control-Allow-Origin",'http://' + webIPaddress + ':' + webPortNumber)
          res.sendFile(newFileLocation);
          console.log('file downloaded:', filename.filename)
        }
      });
     }
 
   })

})

app.delete("/delete/*", async (req,res) =>{
  console.log("delete request")

  // find user requesting
  const url = req.url.toString();
  const userRequest = url.split("/")[2];
  const fileRequest = url.split("/")[3];

  let userFiles;
  let filename;

  UserFiles.forEach((element) => {

    if (element.User.SessionID == userRequest) {
      //Find what image is
      userFiles = element;

      userFiles.Files.forEach(async(file) => {
        if (file.token == fileRequest) {
          filename = file;
    
          fs.unlink(__dirname + "/UserFolders/" + userFiles.User.UserName + '/' + filename.filename, async (err) => {
            if (err) {
              res.header("Access-Control-Allow-Origin", 'http://' + webIPaddress + ':' + webPortNumber);
              res.send('Error 404: Not found')
              console.log('failed to delete');
            }
            //Delete file from MySQL server
            await deleteClass.deleteFile(webIPaddress, webPortNumber, file.FileID, userRequest);
            console.log('File deleted:', file.filename, 'from user:', userFiles.User.UserName)
            res.header("Access-Control-Allow-Origin", 'http://' + webIPaddress + ':' + webPortNumber);
            res.send('OK');
          })
        }
      });
    }
  })

})

//Sends requested file to webpage
app.all("*", async (req, res) => {
  res.send("404 not found")
});

app.listen(port_number, host_IP, () => {
  console.log(
    "Storage server is running on IP address:",
    host_IP + ",",
    "Port number:",
    port_number
  );
});
