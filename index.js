const express = require("express");
const sharp = require("sharp");
const app = express();
let fs = require("fs");
let formidable = require("formidable");
const http = require("http");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const uploadClass = require("./UploadClass");
const zlib = require("zlib");
const cors = require('cors')

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("viewengine", "ejs");


let UserFiles = [];

//Read configure file before server start
let server_configuration = fs.readFileSync("server_config.txt");

server_configuration = server_configuration.toString();

const server_configuration_settings = server_configuration.split("\r\n");

//Port number and IP address
const port_number = server_configuration_settings[2].split(":")[1];
const host_IP = server_configuration_settings[1].split(":")[1];
const webPortNumber = 3000;
const webIPaddress = "10.0.0.15";

app.use(cors({origin: webIPaddress}))

//Need to create Object to store User files

let requestsAllowed = false;
app.get("/", async (req, res) => {
  await res.render("set_up.ejs", {
    IPaddress: host_IP,
    PortNumber: port_number,
  });
});

app.get("/change-settings.html", async (req, res) => {
  res.sendFile(__dirname + "/change-settings.html");
});

app.post("/configure", async (req, res) => {
  console.log("configuring server");

  //Gets the user inputs from web form
  let startUP = "firstStart:" + server_configuration_settings[0].split(":")[1];
  let ip = "host:" + req.body.IP;
  let port = "port:" + req.body.portNumber;

  //Put inputted values into a string to append to server config file
  let add = startUP + "\r\n" + ip + "\r\n" + port;

  fs.writeFileSync("server_config.txt", add, function (err) {
    if (err) console.log(err);
    console.log("New settings added to server config file");
  });
  res.send("Restart server to apply settings.");
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
    console.log("File recieved");
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

          //send request to web server to add user file information to MySQL server
          sendUpload(fields.username, files.filetoupload.originalFilename);

          result.redirect(
            "http://" +
              webIPaddress +
              ":" +
              webPortNumber +
              "/accountmain-page/accountmain.html"
          );
          console.log("file stored", files.filetoupload.originalFilename);
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
          console.log("file stored", files.filetoupload.originalFilename);
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

app.post("/FileTokens", async (req, res) => {
  console.log("Request for token");
  const user = req.body.UserInfo;
  const userFiles = req.body.UserFiles;

  //Loop through each file and add token
  for (let i = 0; i < userFiles.length; i++) {
    //Create new object and add token to it
    userFiles[i] = await GenerateToken(userFiles[i]);
  }

  //Create object to be stored in Database
  const m_user = { User: user, Files: userFiles };
  UserFiles.push(m_user);

  res.send(userFiles);
});

async function sendUpload(p_username, p_filename) {
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
    token: newUserToken,
  };

  return user;
}

//Sends requested file to webpage
app.all("*", async (req, res) => {
  //Find cookie to see who is requesting image
  const url = req.url.toString();
  const userRequest = url.split("/")[1];
  const fileRequest = url.split("/")[2];

  let userFiles;
  let filename;
  UserFiles.forEach((element) => {
    if (element.User.SessionID == userRequest) {
      //Find what image is
      userFiles = element;

      userFiles.Files.forEach((file) => {
        if (file.token == fileRequest) {
          filename = file;

          let newFileLocation = __dirname + "/UserFolders/" +
            userFiles.User.UserName + "/" + filename.filename;

          res.header("Access-Control-Allow-Origin",'http://' + webIPaddress + ':' + webPortNumber)
          res.sendFile(newFileLocation);
          console.log('file downloaded')
        }
      });
      console.log("found user!");
    }
  });
});

app.listen(port_number, host_IP, () => {
  console.log(
    "Storage server is running on IP address:",
    host_IP + ",",
    "Port number:",
    port_number
  );
});
