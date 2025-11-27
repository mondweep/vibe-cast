require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');

async function main() {
    console.log('Testing Google Cloud Authentication...');
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
        projectId: process.env.GOOGLE_PROJECT_ID
    });

    try {
        const projectId = await auth.getProjectId();
        console.log(`✅ Authenticated with ADC!`);
        console.log(`Detected Project ID: ${projectId}`);

        const client = await auth.getClient();
        const token = await client.getAccessToken();
        if (token.token) {
            console.log(`✅ Access Token obtained successfully.`);
        } else {
            console.log(`⚠️ No token returned (might be using compute engine metadata).`);
        }
    } catch (err) {
        console.error(`❌ Authentication failed:`, err.message);
    }
}

main();
