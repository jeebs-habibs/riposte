import * as dotenv from 'dotenv';
import OpenAI from "openai";
import { TwitterApi } from 'twitter-api-v2';
import _agentConfig from "./agentConfig.json";
import { AgentConfig, writeUpdateAgentFile } from './agentFileHelper';
import _historyFile from './tweet-history.json';
import { HistoryFile, Tweet, writeUpdateHistoryFile } from './tweetFileHelper';
import { User, writeUpdateUsersFile } from "./users-helper";
import _users from "./users.json";

//a 

// Set to true if you want to see what the agent would tweet but not actually tweet it.
const TEST_RUN = false

// Read in our cached data
let ourTweets = _historyFile.tweets as Tweet[]
let historyFile = _historyFile as HistoryFile
let users = _users as User[]

// Read in agent data
let agentConfig = _agentConfig as AgentConfig

// Load environment variables from .env file
dotenv.config();

const CONSUMER_KEY = getEnvVariable("CONSUMER_KEY")
const CONSUMER_SECRET = getEnvVariable("CONSUMER_SECRET")
const ACCESS_TOKEN = getEnvVariable("ACCESS_TOKEN")
const ACCESS_SECRET_TOKEN = getEnvVariable("ACCESS_SECRET_TOKEN")
const BEARER_TOKEN = getEnvVariable("BEARER_TOKEN")
const OPENAI_API_KEY = getEnvVariable("OPENAI_API_KEY")

function getEnvVariable(name: string){
  const value = process.env[name]
  if(!value){
    throw Error("Environment variable: " + name + " is undefined.")
  } else {
    return value
  }

}

// Instantiate with desired auth type (here's Bearer v2 auth)
const twitterClient = new TwitterApi({ 
  appKey: CONSUMER_KEY, 
  appSecret: CONSUMER_SECRET, 
  accessSecret: ACCESS_SECRET_TOKEN, 
  accessToken: ACCESS_TOKEN
});

const writeClient = twitterClient.readWrite

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

async function getAgentUserId(): Promise<string> {
  const idFromUsers = agentConfig.agentUserId
  if(!idFromUsers){
    console.log("Getting user id from twitter API.")
    const retrievedUser = await twitterClient.v2.userByUsername(agentConfig.agentHandle)
    if(retrievedUser.data){
      agentConfig.agentUserId = retrievedUser.data.id
      console.log(agentConfig.agentUserId)
      return agentConfig.agentUserId
    } else {
      throw Error("Unable to fetch user id.")
    }

  } else {
    console.log("Getting cached agent user id.")
    return idFromUsers
  }
  
}

const AGENT_USER_ID = await getAgentUserId()

async function makePostGivenPrompt(prompt: string, replyToId?: string ){
  console.log("Agent generating response...")
  const completion = await openai.chat.completions.create({
    model: "grok-beta",
    messages: [
      { role: "system", content: agentConfig.agentSystemPrompt },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 1
  });

  const response = completion.choices[0].message

  if(response.refusal){
    throw Error("Agent refused to answer prompt.")
  } else if(response.content) {
    const tweetPayload = replyToId ? {
      reply: {
        in_reply_to_tweet_id: replyToId
      }
    } : {}
    if(!TEST_RUN){
      const marvReply = await writeClient.v2.tweet(response.content, tweetPayload)
      console.log("Successfully tweeted: " + response.content)
      ourTweets = [...ourTweets, {...marvReply.data, author_id: AGENT_USER_ID, in_reply_to_id: replyToId, author_username: agentConfig.agentHandle, created_at: new Date().toISOString()}]
    } else {
      console.log("THIS IS A TEST RUN! Would have tweeted: " + response.content)
    }
  } else {
    throw Error("Agent returned result but reponse.content was undefined")
  }

}

let tweetsFromTrackedUsersRepliedTo = 0
async function replyToTrackedUsers(){
  let randomUser = users[Math.floor(Math.random() * users.length)]

  if(!randomUser.id){
    // If id is not defined, get it and set it
    const retrievedUser = await twitterClient.v2.userByUsername(randomUser.username)
    if(retrievedUser.data){
      console.log("Retrieved user info: " + retrievedUser.data)
      users = users.map((user) => {
        if(user.username == randomUser.username){
          const updatedUser = {...user, id: retrievedUser.data.id }
          randomUser = updatedUser
          return updatedUser
        }
        return user
      })
    } else {
      console.log("Error getting user info for: " + randomUser.username)
    }
  }
  if(!randomUser.id){
    throw Error("No id present for user, cannot get their tweets")
  }
  const tweetsFromUser = (await twitterClient.v2.userTimeline(randomUser.id, 
    { 
      "max_results": 5,
      "tweet.fields": ["created_at"],
      "exclude": ["retweets", "replies"]
    }))
    if (!tweetsFromUser.data.errors) {
      for (const tweetFromUser of tweetsFromUser.data.data) {
        if (tweetFromUser.text.length > 50) {
          await makePostGivenPrompt(tweetFromUser.text, tweetFromUser.id);
          tweetsFromTrackedUsersRepliedTo += 1
          ourTweets = [...ourTweets, {...tweetFromUser, author_username: randomUser.username}]
        } else {
          console.log("No tweet > 50 characters to reply to :(")
        }
      }
    } else {
      console.log("Tweets from user are undefined")
    }
    if(tweetsFromTrackedUsersRepliedTo == 0){
      replyToTrackedUsers()
    }
}

async function replyToRecentUserMentions() {
  try {
    const response = await writeClient.v2.userMentionTimeline(AGENT_USER_ID, 
      { 
        "max_results": 5,
        "expansions": ["author_id"],
        "tweet.fields": ["created_at"]
      });
    if (response.data) {
      for (const tweet of response.data.data) {

        const agentAlreadyResponded = ourTweets.some(
          (ourTweet) => ourTweet.in_reply_to_id === tweet.id && ourTweet.author_id === AGENT_USER_ID
        );

        if (!tweet.in_reply_to_user_id && !agentAlreadyResponded && tweet.author_id != AGENT_USER_ID) {
          // Agent responds to the tweet
          await makePostGivenPrompt(tweet.text, tweet.id);
          ourTweets = [...ourTweets, {...tweet, author_id: tweet.author_id}];
        } else {
          console.log("Mention was a reply. Avoiding responding to these tweets since Agent has no insight into threads (yet).");
        }
      }
    } else {
      console.error("Response from userMentionTimeline is undefined");
    }
  } catch (err) {
    console.error("Error replying to recent user mentions: ", err);
  }
}

await replyToRecentUserMentions()
console.log("Finished responding to recent mentions.")

await replyToTrackedUsers()
console.log("Finished responding to posts from tracked users.")

await makePostGivenPrompt(agentConfig.agentTweetTopics[Math.floor(Math.random() * agentConfig.agentTweetTopics.length)])
console.log("Finished daily post, writing data to JSON file.")

writeUpdateHistoryFile({...historyFile, tweets: ourTweets})
writeUpdateUsersFile(users)
writeUpdateAgentFile(agentConfig)
