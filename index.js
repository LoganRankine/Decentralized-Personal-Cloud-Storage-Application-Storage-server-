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
const cors = require("cors");
const file = require("./Server_configuration.json");

//Created classes
const uploadClass = require("./UploadClass");
const deleteClass = require("./DeleteRequestClass");
const renameClass = require("./RenameRequestClass");
const tokenClass = require("./TokenGenClass");
const authoriseClass = require("./AuthorisationClass");

app.use(express.urlencoded({ extended: true, limit: "10gb" }));
app.use(express.json());
app.set("viewengine", "ejs");

let UserFiles = [];

//Port number and IP address
let port_number = file.FileServerPort;
let host_IP = file.FileServerIP;
let webPortNumber = file.WebServerPort;
let webIPaddress = file.WebServerIP;

app.use(
  cors({
    origin: "http://" + webIPaddress + ":" + webPortNumber,
    exposedHeaders: "*",
  })
);

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

  let newjson = JSON.stringify(file);

  fs.writeFile(
    __dirname + "Server_configuration.json",
    newjson,
    function (err) {
      if (err) {
        console.log(err);
      }
      console.log("Saved confige");
      res.send("Restart server!");
      process.exit();
    }
  );
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
      res.statusCode = 200;
      res.send("OK");
    }
  } catch (err) {
    console.error(err);
    res.statusCode = 400;
    res.send("Bad Request");
  }
});

//uploads image to user file directory
app.post("/upload?*", async (req, result) => {
  try {
    //Get sessionID from request
    var sessionID = req.url.replace("/upload?sessionID=", "");

    //Validate request
    var userinformation = await authoriseClass.Authorise(sessionID);

    await uploadClass.UploadToServer(result, req, userinformation);
    result.status = 200;
    result.send("File upload successful");
  } catch (err) {
    /*
    UserFiles.forEach(async (user) => {
      //Match session ID on server to one provided
      if (user.User.SessionID == sessionID) {
        await uploadClass.UploadToServer(
          webIPaddress,
          webPortNumber,
          result,
          req,
          user.User.userDirectory,
          user.User.UserName, 
          sessionID
        );
        result.status = 200;
        result.send("File upload successful");
      }
    });
    */
    console.error(err);
    result.status = 400;
    result.send("File upload unsuccessful");
  }
});

//Rename file recieved
app.put("/rename?*", async (req, res) => {
  try {
    await renameClass.RenameFile(req);
    res.send("OK");
  } catch (err) {
    console.log(err);
    res.send("404");
  }
});

app.post("/FileTokens", async (req, res) => {
  const user = req.body.UserInfo;
  const userFiles = req.body.UserFiles;

  console.log(user.UserName, "request for file tokens");

  UserFiles.push(await tokenClass.CreateFileTokens(res, user, userFiles));

  console.log("File tokens created for user:", user);
});

//Preview file
app.get("/preview/*", async (req, res) => {
  console.log("preview request");

  // find user requesting
  const url = req.url.toString();
  const userRequest = url.split("/")[2];
  const fileRequest = url.split("/")[3];

  let userFiles;
  let filename;
  UserFiles.forEach((element) => {
    if (element.User.SessionID == userRequest) {
      userFiles = element;
      userFiles.Files.forEach((file) => {
        if (file.token == fileRequest) {
          filename = file;

          let newFileLocation =
            __dirname +
            "/UserFolders/" +
            userFiles.User.userDirectory +
            "/" +
            filename.filename;

          res.header(
            "Access-Control-Allow-Origin",
            "http://" + webIPaddress + ":" + webPortNumber
          );
          res.sendFile(newFileLocation);
          console.log("file previewed:", filename.filename);
        }
      });
    }
  });
});

//Download
app.get("/download/*", async (req, res) => {
  console.log("download request");

  // find user requesting
  const url = req.url.toString();
  const userRequest = url.split("/")[2];
  const fileRequest = url.split("/")[3];

  let userFiles;
  let filename;
  //Find user files
  UserFiles.forEach((element) => {
    if (element.User.SessionID == userRequest) {
      userFiles = element;
      userFiles.Files.forEach((file) => {
        //Get file that corresponds to file token
        if (file.token == fileRequest) {
          filename = file;

          //Get file directory
          let newFileLocation =
            __dirname +
            "/UserFolders/" +
            userFiles.User.userDirectory +
            "/" +
            filename.filename;

          res.header(
            "Access-Control-Allow-Origin",
            "http://" + webIPaddress + ":" + webPortNumber
          );
          res.sendFile(newFileLocation);
          console.log("file downloaded:", filename.filename);
        }
      });
    }
  });
});

app.delete("/delete?*", async (req, res) => {
  console.log("delete request");

  await deleteClass.deleteFile(req,res)
  
/*
  fs.unlink(
    __dirname +
      "/UserFolders/" +
      userFiles.User.userDirectory +
      "/" +
      filename.filename,
    async (err) => {
      if (err) {
        res.header(
          "Access-Control-Allow-Origin",
          "http://" + webIPaddress + ":" + webPortNumber
        );
        res.send("Error 404: Not found");
        console.log("failed to delete");
      }
      //Delete file from MySQL server
      await deleteClass.deleteFile(
        webIPaddress,
        webPortNumber,
        file.FileID,
        userRequest
      );
      console.log(
        "File deleted:",
        file.filename,
        "from user:",
        userFiles.User.UserName
      );
      res.header(
        "Access-Control-Allow-Origin",
        "http://" + webIPaddress + ":" + webPortNumber
      );
      res.send("OK");
    }
  );
  */

});

//Sends requested file to webpage
app.all("*", async (req, res) => {
  res.send("404 not found");
});

app.listen(port_number, host_IP, () => {
  console.log(
    "Storage server is running on IP address:",
    host_IP + ",",
    "Port number:",
    port_number
  );
});
