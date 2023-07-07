const file = require("./Server_configuration.json");
const http = require("http");

const FileServerIP = file.FileServerIP;
const FileServerPort = file.FileServerPort;
const webIPaddress = file.WebServerIP;
const webPortNumber = file.WebServerPort;

async function Authorise(
    sessionID
  ) {
    return new Promise((resolve, reject) => {  
      let sendFileInfoOptions = {
        hostname: webIPaddress,
        path: `/authoriseUser?sessionID=${sessionID}`,
        port: webPortNumber,
        method: "GET",
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
            console.log(response)
            sendFileInfoReq.end();
            resolve(response);
          });
        })
        .on("error", (err) => {
          console.log("Error: ", err);
          
        })
        .end();
    });
  }

  module.exports = {Authorise}