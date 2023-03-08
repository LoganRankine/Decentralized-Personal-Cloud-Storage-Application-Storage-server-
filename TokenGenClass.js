const crypto = require('crypto')

async function CreateFileTokens(res,user,userFiles){

    return new Promise(async(resolve, reject) =>{

    //Loop through each file and add token
    for (let i = 0; i < userFiles.length; i++) {
        //Create new object and add token to it
        userFiles[i] = await GenerateToken(userFiles[i]);
    }

    //Create object to be stored in Database
    const m_user = { User: user, Files: userFiles };
    //UserFiles.push(m_user);
    console.log('File tokens created for user:',user)

    res.send(userFiles);
    resolve(m_user)
    })

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

module.exports = {CreateFileTokens}