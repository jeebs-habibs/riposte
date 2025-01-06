# Riposte
Riposte is an AI Agente framework focused to deliver agents on X that can post, reply, and tweet at others. This has yet to be done before. Checkout out working example at 

## How it works
TODO: Add more info here

## Get Started
### Setting up your agent's account
Create your agent's X account. Once created, you will need to navigate to the developer portal to get your API keys https://developer.x.com/en/portal/dashboard.

Copy the API keys and fill them into the .env file

DO NOT SHARE THESE KEYS OR COMMIT THIS FILE TO GITHUB. It should only exist locally

Next you will need to get your OpenAI API key. You can use a key from Grok (X AI), ChatGPT, or another provider. Add this key to the .env file.

### Populate config.json
Fill in this file with info on your agent. Tweak the system prompt as needed to give your agent boundaries and guidelines on how to respond.


### Development
- Setup local .env file
- npx tsx agent.ts

