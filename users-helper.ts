import fs from 'fs';

export interface User {
    username: string,
    id?: string
}
  
export function writeUpdateUsersFile(users: User[]){
    fs.promises.writeFile("./users.json", JSON.stringify(users, null, 2)).then(() => {
        console.log("Successfully wrote new users to file:")
    }).catch((err) => {
        throw Error("Error writing new users to file: " + err)
    })
}