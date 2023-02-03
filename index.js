const express = require('express');
const app = express();
let fs = require('fs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Read configure file before server start
let server_configuration = fs.readFileSync('server_config.txt')

let first_start = server_configuration.toString()
first_start.split(':')[1]

let requestsAllowed = false;
app.post('/', async (req,res)=>{
    //res.sendFile(__dirname + '/set_up.html')
    var user1 = req.body.user
    console.log(user1)
    const user = {lastname: 'rankine'}
    res.send(user)
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