// Sift is a small routing library that abstracts away details like starting a
// listener on a port, and provides a simple function (serve) that has an API
// to invoke a function for a specific path.
import { json, serve, validateRequest } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'
// TweetNaCl is a cryptography library that we use to verify requests
// from Discord.
import nacl from 'https://cdn.skypack.dev/tweetnacl@v1.0.3?dts'

enum DiscordCommandType {
  Ping = 1,
  ApplicationCommand = 2,
}

// For all requests to "/" endpoint, we want to invoke home() handler.
serve({
  '/discord-bot': home,
})

// The main logic of the Discord Slash Command is defined in this function.
async function home(request: Request) {
  console.log('HTTP INPUT: ', request);
  // validateRequest() ensures that a request is of POST method and
  // has the following headers.
  const { error } = await validateRequest(request, {
    POST: {
      headers: ['X-Signature-Ed25519', 'X-Signature-Timestamp'],
    },
  })
  if (error) {
    return json({ error: error.message }, { status: error.status })
  }

  // verifySignature() verifies if the request is coming from Discord.
  // When the request's signature is not valid, we return a 401 and this is
  // important as Discord sends invalid requests to test our verification.
  const { valid, body } = await verifySignature(request)
  if (!valid) {
    return json(
      { error: 'Invalid request' },
      {
        status: 401,
      }
    )
  }

  const { type = 0, data = { options: [] } } = JSON.parse(body)
  // Discord performs Ping interactions to test our application.
  // Type 1 in a request implies a Ping interaction.
  if (type === DiscordCommandType.Ping) {
    return json({
      type: 1, // Type 1 in a response is a Pong interaction response type.
    })
  }

  // Type 2 in a request is an ApplicationCommand interaction.
  // It implies that a user has issued a command.
  if (type === DiscordCommandType.ApplicationCommand) {
    const { value } = data.options.find(
      (option: { name: string; value: string }) => option.name === 'name'
    )
    const query = value;

    // //CHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPT
    // const apiKey = "sk-proj-XBBgpwTUcldag3nixTCdT3BlbkFJh7XRuMoaL2Sn7Uq4e2RH"
    // const openai = new OpenAI({
    //   apiKey: apiKey,
    // })
    // console.log('CHATGPT QUERY: ', query)
    // const content = `You are a comedic and friendly assistant who should talk like Donald Trump. 
    // You are super excited to talk about your 2024 campaign. 
    // Also, there is somone named Paul Klinger and everyonce in a while you mention how you met him once and you think he is weird.`

    // // const content = "you are a helpful chatbot"
    // const chatCompletion = await openai.chat.completions.create({
    //   messages: [
    //     { 
    //       role: 'system', 
    //       content: content 
    //     },
    //     { 
    //       role: 'user', 
    //       content: query 
    //     }
    //   ],
    //   model: 'gpt-4',
    //   stream: false,
    // })
    // const reply = chatCompletion.choices[0].message.content
    // console.log('CHATGPT REPLY: ', reply)
    // //CHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPTCHATGPT

    return json({
      // Type 4 responds with the below message retaining the user's
      // input at the top.
      type: 4,
      data: {
        content: query,
      },
    })
  }

  
  // We will return a bad request error as a valid Discord request
  // shouldn't reach here.
  return json({ error: 'bad request' }, { status: 400 })
}

/** Verify whether the request is coming from Discord. */
async function verifySignature(request: Request): Promise<{ valid: boolean; body: string }> {
  const PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY')!
  // Discord sends these headers with every request.
  const signature = request.headers.get('X-Signature-Ed25519')!
  const timestamp = request.headers.get('X-Signature-Timestamp')!
  const body = await request.text()
  const valid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY)
  )
  return { valid, body }
}

/** Converts a hexadecimal string to Uint8Array. */
function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)))
}