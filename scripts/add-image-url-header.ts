import { getSheets, SHEET_NAMES } from './lib/sheets';
import { SPREADSHEET_ID } from './lib/config';

async function addImageUrlHeader() {
  const sheets = getSheets();
  
  try {
    // Get the current headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.SERVICES}!A1:Z1`,
    });
    
    const currentHeaders = response.data.values?.[0] || [];
    console.log('Current headers:', currentHeaders);
    
    // Check if image_url already exists
    if (currentHeaders.includes('image_url')) {
      console.log('✅ image_url header already exists!');
      return;
    }
    
    // Add image_url to the end
    const newHeaders = [...currentHeaders, 'image_url'];
    console.log('New headers:', newHeaders);
    
    // Update the header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAMES.SERVICES}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newHeaders],
      },
    });
    
    console.log('✅ Successfully added image_url header to Services sheet!');
  } catch (error) {
    console.error('❌ Error adding header:', error);
  }
}

addImageUrlHeader();
