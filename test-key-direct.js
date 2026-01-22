const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Hardcoded key to verify content directly
// I will paste the key cleanly here, separating lines with actual newlines to avoid any \n parser issues.
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDAayVXXOGH6++i
yjxWu7/gMrpnlRq7MjbSQ9qlXzFGYHi9Ukw8UhXkWJc7fIvFvBNFFxeqa3Locrjz
wSdZQacy2pHipFYmJIg5TcaUXrBdsllJPIZbtTDigGxawzIknot0JFljQxbVXX6X
95z11ZW9DN5VtN2JGwHWsWOVSCAguj2uYU0xAcGuu+8Nx2BHdHAdc3eGWPElKQyz
ihbFpj7uQFzBzbxqklqHe2dyWkDyrryf4ZiKX+YbReAefcv7bvgFE+Y1mu28Ne5o
IosL6+69p5qf++NcAPhOsSPoIoseAKs3u/Qf4WVtT8++OAwD4d1PQ7Ah4kyiMIrL
h9fgqavTAgMBAAECggEABmhrDW4/6n1edR7kBIVrHeXClGmAQuSos7bjxKcXZn8W
9kMT29xl8z1KCAadRv/86kubE6dRY9FSPHfdvhi0HzrtKc2MOufzi2j+KHnAyNYE
KC62UL6HeruJIDqo5FRNU5hUS7xzubZL3Xa3CO7MdkfD7bnAuOyn0oUEyndk7oIG
eIBpGxM8Ze7zR0QN3FU0IUwG/Sp/7ISJscHlLeV2aXcJx0qr7VB6ZPfZLr3XMU5W
sgukEb+VhvALg86iqu7HG0nLuqAPTSw0IMQAwhBiG7woj2I9BoYetA22VYtJA82s
neVYEPixImO9ndHLtnoySfaw8XWiIWdt25FbKMvyLQKBgQDoZlIJwlwOs5AZdmN+
UGVb0hhYuBUhBQLAzX9AT0u1xygH8F9ee7UsJm6wh6fdQcZlpPf175IS/kjxvZxU
kviWzha+h+7zvbptWtSgUl57/r/UihmX+NzKt9Blndoakuk2Pmc+s6DTqRYeOANe
liuG0l2JR4WX1jNttc+PZE3GtQKBgQDT9XAjS2sNzrvKikXH/0MazeOAucxG8fBu
s3oZ36tgKoCjXkBrbH/253F0ZiYcPXvmGH2XanWz2eLHkhGtplfCvT8S3hTZLrDW
vaUBxAi08iH6GgNS+xUFKQoag5GCL6L9nckSSOpnD5pnYrvbq4nK4tUJkd0isw5i
WVD6DhZ1ZwKBgQCqWpa4YKhqfmWaxJWZ+gTSkecW4ZlbYvjpq7kjwvyUezB04VaH
Q9dCTcnFzSrXnWd5CrxYowxIr+14hq0ZscJXiSpS8AHQ2brWfkZuXvKzocGsYq7w
H5R5ZNR2KIfAAwDAqm20IKg7fy6faB/QLfQqF/pIrwzWiEWanjNPwQ7iIQKBgQCY
lRT2s3ILbIlPUp7NTHq4LwLZRedCIySb7GO3gIZUIgScllr1ehPcX9wSmP5SUgiB
KZwvhhnZML7KP+KuCRMgQy/Gm0yS08PFspu4W7CQ4cWHz3YZJFqLbnGxiIkVGMnS
nOWEXi0vp9HVHwRxLFlzTjtiOjjgo9l0/ysF92I/fQKBgQCo5NaagOKOl0nqMRsB
uVdPEFRs+NuURXnnCNmZ13749/OFIZwvzFMFaOGuEZ3FSG8o8OnQcOT8aNKMjpH6
ZTzKjM8afwPrHWx3/Ko/Nie2wae23Wqru5xP8qrTNBHI2JmsxOMpt0adHTSND/6q
3HdfJKCCtz4aM8oLbczVC92WMQ==
-----END PRIVATE KEY-----
`;

async function main() {
    console.log('Testing hardcoded key...');
    
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: 'catering-app-service@catering-app-483510.iam.gserviceaccount.com',
          private_key: PRIVATE_KEY,
        },
        scopes: SCOPES,
    });

    try {
        const client = await auth.getClient();
        console.log('Auth Client created successfully with hardcoded key!');
        
        const sheets = google.sheets({ version: 'v4', auth: client });
        const res = await sheets.spreadsheets.get({
            spreadsheetId: '14RCjSbEIK1-FXkdR3OrOe__gypFnXYdDDUhfbAcGtM0'
        });
        console.log('Sheet Title:', res.data.properties.title);
        
    } catch (error) {
        console.error('Hardcoded Key Error:', error.message);
    }
}

main();
