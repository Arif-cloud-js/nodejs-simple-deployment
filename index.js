const express = require('express');
const cors = require('cors');  // Import the cors package
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { SpacesServiceClient } = require('@google-apps/meet').v2;
const { auth } = require('google-auth-library');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());  // Use the cors middleware

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return auth.fromJSON(credentials);
  } catch (err) {
    console.log(err);
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Creates a new meeting space.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function createSpace(authClient) {
  const meetClient = new SpacesServiceClient({
    authClient: authClient
  });
  // Construct request
  const request = {
  };

  // Run request
  const response = await meetClient.createSpace(request);
  return response[0].meetingUri;
}
app.get('/',(req,res)=>{
  res.json({
    message :'it is working now on vercel '
  })
})
app.get('/create-meet-space', async (req, res) => {
  console.log('I am called');
  try {
    const authClient = await authorize();
    const meetingUri = await createSpace(authClient);
    res.status(200).json({ meetingUri: meetingUri });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meet space' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
