require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function main() {
    let log = '';
    function logMsg(...args) {
        console.log(...args);
        log += args.join(' ') + '\n';
        fs.writeFileSync('debug.log', log); // Sync write to ensure we catch it
    }

    logMsg('--- Starting Debug ---');
    logMsg('Email:', process.env.MASTER_SERVICE_ACCOUNT_EMAIL);
    
    let privateKey = process.env.MASTER_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!privateKey) {
        logMsg('Private key missing!');
        return;
    }

    logMsg('Raw Key Length:', privateKey.length);
    logMsg('Raw first 20:', privateKey.substring(0, 20));

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
    // Replace literal \n with real newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    logMsg('Processed Key Length:', privateKey.length);
    logMsg('Processed first 50:', privateKey.substring(0, 50));
    logMsg('Processed last 50:', privateKey.substring(privateKey.length - 50));
    
    // Check if lines are split
    const lines = privateKey.split('\n');
    logMsg('Line count:', lines.length);

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
              client_email: process.env.MASTER_SERVICE_ACCOUNT_EMAIL,
              private_key: privateKey,
            },
            scopes: SCOPES,
        });

        const client = await auth.getClient();
        logMsg('Auth Client created successfully.');

        const sheets = google.sheets({ version: 'v4', auth: client });
        const res = await sheets.spreadsheets.get({
            spreadsheetId: process.env.MASTER_SPREADSHEET_ID
        });

        logMsg('Spreadsheet fetch success!');
        logMsg('Sheet Title:', res.data.properties.title);
        
        // Use logic from initializeSheets to see if we need to add anything
        const existingSheets = res.data.sheets.map(s => s.properties.title);
        logMsg('Existing Sheets:', existingSheets.join(', '));
        
        const SHEET_NAMES = {
          USERS: 'Users',
          SESSIONS: 'Sessions',
          SERVICES: 'Services',
          ENTITLEMENTS: 'Entitlements',
          OTPS: 'OTPs',
        };
        
        const requests = [];
        for (const sheetName of Object.values(SHEET_NAMES)) {
          if (!existingSheets.includes(sheetName)) {
            logMsg(`Missing sheet: ${sheetName}`);
            requests.push({
              addSheet: {
                properties: { title: sheetName },
              },
            });
          }
        }
        
        if (requests.length > 0) {
            logMsg('Adding missing sheets...');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: process.env.MASTER_SPREADSHEET_ID,
                requestBody: { requests },
            });
            logMsg('Sheets added.');
            
            // Add headers
             const HEADERS = {
              [SHEET_NAMES.USERS]: ['user_id', 'email', 'role', 'created_at', 'status'],
              [SHEET_NAMES.SESSIONS]: ['session_id', 'user_id', 'device_info', 'created_at', 'expires_at', 'last_active_at', 'ip_address'],
              [SHEET_NAMES.SERVICES]: ['service_id', 'name', 'description', 'redirect_url', 'free_tier_enabled'],
              [SHEET_NAMES.ENTITLEMENTS]: ['entitlement_id', 'user_id', 'service_id', 'tier_level', 'valid_until'],
              [SHEET_NAMES.OTPS]: ['email', 'otp_code', 'expires_at', 'created_at'],
            };
            
             for (const [sheetName, headers] of Object.entries(HEADERS)) {
              await sheets.spreadsheets.values.update({
                spreadsheetId: process.env.MASTER_SPREADSHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [headers]
                }
              });
              logMsg(`Headers added for ${sheetName}`);
            }
        } else {
            logMsg('All sheets already exist.');
        }

    } catch (error) {
        logMsg('API Error:', error.message);
    }
}

main();
