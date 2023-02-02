const express = require('express');
const app = express();
let fs = require('fs');


let requestsAllowed = false;

//Create user directory
app.get('/CreateUserDirectory', async (req,res)=>{
    res.send('logan')
    console.log('user directory creation request')
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

//Sends requested file to webpage
app.all('*', async(req,res)=>{
    if(requestsAllowed){
        //get which user is requesting the image
        let user = req.url.toString().split('/')
        let currentUser = user[1];
        let fileRequested = user[2];
        if(req.url.toString().includes(currentUser)){
            let newFileLocation = 'C:/Users/logan/source/repos/Decentralized-Personal-Cloud-Storage-Application-Storage-server-/UserFolders/' + currentUser + '/' + fileRequested
            var remove = "C:/Users/logan/source/repos/Decentralized-Personal-Cloud-Storage-Application/UserFolders/" + currentUser + '/' + fileRequested
            res.sendFile(newFileLocation);
            console.log("image requested:", newFileLocation)
        }
    }
    else{
        res.send("404 not found")
      }
})

app.listen(3001, () => {
  console.log('Storage server is up on port 3001');
});