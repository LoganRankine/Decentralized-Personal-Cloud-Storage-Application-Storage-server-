const http = require("http");
const express = require("express");
let fs = require("fs");
let formidable = require("formidable");
const file = require("./Server_configuration.json");
const crypto = require("crypto");

const FileServerIP = file.FileServerIP;
const FileServerPort = file.FileServerPort;
const webIPaddress = file.WebServerIP;
const webPortNumber = file.WebServerPort;
const app = express();
app.use(express.urlencoded({ extended: true, limit: "10gb" }));

let { parentPort, workerData } = require("worker_threads");

if (workerData != null) {
  UploadToServer(
    workerData.webip,
    workerData.webIPaddress,
    workerData.webport,
    workerData.res,
    workerData.request,
    workerData.directory,
    workerData.username
  );
}

async function UploadToServer(result, req, userinfoJSON) {
  let userinformation = JSON.parse(userinfoJSON)
  let directoryname = userinformation.directory
  let username = userinformation.username
  let sessionid = userinformation.sessionID

  return new Promise((resolve, reject) => {
    let fileUpload = new formidable.IncomingForm({
      maxFileSize: "100gb",
    });

    fileUpload.parse(req, async function (err, fields, files) {
      console.log("File recieved");

      //Ensure file has been uploaded
      if (files.file.size != 0) {
        //Create paths to move file from temp to correct directory
        let oldpath = files.file.filepath;

        let filename = files.file.originalFilename;
        let fileType = filename.split(".").pop();

        let obscuredName = await SaveFile(oldpath, directoryname, fileType);

        //Update database with file information
        await sendUpload(filename, obscuredName, fileType, sessionid);
        resolve()

      } else {
        console.log("No file sent");
      }
    });
  });
}

//Returns the name of file
async function SaveFile(oldPath, directoryName, fileType) {
  return new Promise((resolve, reject) => {
    //Create paths to move file from temp to correct directory
    const obscureFilename = crypto.randomBytes(20).toString("base64url");
    let newPath =
      __dirname +
      "/UserFolders/" +
      directoryName +
      obscureFilename +
      `.${fileType}`;

    //Ensure file path exists
    if (!fs.existsSync(newPath)) {
      //Move from temp to user directory
      fs.copyFile(oldPath, newPath, async function (err) {
        if (err) throw err;

        //Remove temp file
        fs.unlink(oldPath, function (err) {
          if (err) throw err;
          resolve(obscureFilename)
          return obscureFilename;
        });
      });
    }
  });
}

async function sendUpload(p_filename, p_obscured, p_filetype, sessionID) {
  return new Promise((resolve, reject) => {
    //Get date uploaded
    let date = new Date();

    let time = date.toLocaleTimeString();
    let days = date.toLocaleDateString();

    let splitted = days.split("/");
    let day = splitted[0];
    let month = splitted[1];
    let year = splitted[2];

    let dateuploaded = day + "-" + month + "-" + year + " " + time;

    let sendFileInfomation = JSON.stringify({
      filename: p_filename,
      dateuploaded: dateuploaded,
      filetype: p_filetype,
      filetoken: p_obscured,
    });

    let sendFileInfoOptions = {
      hostname: webIPaddress,
      path: `/addFileToDB?sessionID=${sessionID}`,
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
          resolve();
        });
      })
      .on("error", (err) => {
        console.log("Error: ", err);
        //Sends username to storage server to be used to get the correct users directory information
      })
      .end(sendFileInfomation);
  });
}

module.exports = { UploadToServer };
