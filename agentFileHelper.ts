import fs from 'fs';

export interface AgentConfig {
    agentHandle: string;
    agentSystemPrompt: string;
    agentTweetTopics: string[];
    agentUserId?: string;
}

export function writeUpdateAgentFile(agentFile: AgentConfig){
    fs.promises.writeFile("./agentConfig.json", JSON.stringify(agentFile, null, 2)).then(() => {
        console.log("Successfully wrote new data to file:")
    }).catch((err) => {
        throw Error("Error writing new data to file: " + err)
    })
}