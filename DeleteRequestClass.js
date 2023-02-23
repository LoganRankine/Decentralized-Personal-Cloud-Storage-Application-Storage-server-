const http = require("http");

async function deleteFile(webIPaddress,webPortNumber,fileID, user){
    return new Promise((resolve, reject) =>{
        let sendFileInfoOptions = {
            hostname: webIPaddress,
            path: '/delete/' + user + '/' + fileID,
            port: webPortNumber,
            method: 'DELETE',
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
            if(sendFileInfoReq.end()){
                resolve()
            }
          });
        }).on("error", (err) => {
          console.log("Error: ", err)
          //Sends username to storage server to be used to get the correct users directory information
        }).end('delete')
    })
      
}

module.exports = {deleteFile}