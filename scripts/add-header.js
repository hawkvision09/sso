require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
let SERVICE_ACCOUNT_KEY = process.env.SERVICE_ACCOUNT_KEY;

// Process the key the same way as config.ts
if (SERVICE_ACCOUNT_KEY) {
  SERVICE_ACCOUNT_KEY = SERVICE_ACCOUNT_KEY.trim();
  
  // Remove outer quotes
  if ((SERVICE_ACCOUNT_KEY.startsWith('"') && SERVICE_ACCOUNT_KEY.endsWith('"')) || 
      (SERVICE_ACCOUNT_KEY.startsWith("'") && SERVICE_ACCOUNT_KEY.endsWith("'"))) {
    SERVICE_ACCOUNT_KEY = SERVICE_ACCOUNT_KEY.slice(1, -1);
  }
  
  // Replace literal \n with actual newlines
  if (SERVICE_ACCOUNT_KEY.includes('\\n')) {
    SERVICE_ACCOUNT_KEY = SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  }
}

async function addImageUrlHeader() {
  try {
    console.log('SERVICE_ACCOUNT_KEY length:', SERVICE_ACCOUNT_KEY?.length);
    console.log('First 50 chars:', SERVICE_ACCOUNT_KEY?.substring(0, 50));
    console.log('Last 50 chars:', SERVICE_ACCOUNT_KEY?.substring(SERVICE_ACCOUNT_KEY.length - 50));
    
    const serviceAccountKey = JSON.parse(SERVICE_ACCOUNT_KEY);

    // Create auth client
    const auth = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Get current headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Services!A1:Z1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log('Current headers:', currentHeaders);

    // Check if image_url exists
    if (currentHeaders.includes('image_url')) {
      console.log('✅ image_url header already exists!');
      return;
    }

    // Add image_url
    const newHeaders = [...currentHeaders, 'image_url'];
    console.log('Adding image_url header...');

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Services!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [newHeaders],
      },
    });

    console.log('✅ Successfully added image_url header to Services sheet!');
    console.log('New headers:', newHeaders);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

addImageUrlHeader();
