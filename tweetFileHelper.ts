import fs from 'fs';

export interface HistoryFile {
    tweets: Tweet[]
}

export interface Tweet {
    id: string
    text: string
    in_reply_to_id?: string
    author_id?: string
    author_username?: string
    in_reply_to_username?: string,
    created_at?: string
}

export function writeUpdateHistoryFile(historyFile: HistoryFile){
    fs.promises.writeFile("./tweet-history.json", JSON.stringify(historyFile, null, 2)).then(() => {
        console.log("Successfully wrote new tweets to file:")
    }).catch((err) => {
        throw Error("Error writing new tweet to file: " + err)
    })
}
