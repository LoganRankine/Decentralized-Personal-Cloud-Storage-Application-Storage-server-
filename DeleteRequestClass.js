const http = require("http");

async function deleteFile(webIPaddress,webPortNumber,fileID, user){
    return new Promise((resolve, reject) =>{
        //Request to delete file from SQL database
        let sendFileInfoOptions = {
            hostname: webIPaddress,
            path: '/delete/' + user + '/' + fileID,
            port: webPortNumber,
            method: 'DELETE',
          }
        //Requests to delete file information
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
        }).end('delete')
    }) 
}

module.exports = {deleteFile}