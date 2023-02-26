async function RenameFile(p_URL){

    const url = p_URL.toString();
    const userToken = url.split("/")[2];
    const fileToken = url.split("/")[3];

    let found = 
    UserFiles.forEach(async userInfo =>{
    if(userInfo.User.SessionID == userToken){
      //found user
    }
  })

    console.log('Renaming file')

}
module.exports ={RenameFile}