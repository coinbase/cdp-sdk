// Amplitude Export API - Get Page View Events for Last Hour
// Based on: https://amplitude.com/docs/apis/analytics/export

import https from 'https';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';
const pipeline = promisify(stream.pipeline);

// Configuration - Replace with your actual credentials
const API_KEY = '6cf69a22c0014f7608dd967f605ba0e7';
const SECRET_KEY = 'd553cce11913a4d4cd6967f62de0235b';

/**
 * Get formatted timestamp for Amplitude API (YYYYMMDDTHH format)
 */
function getAmplitudeTimestamp(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}${month}${day}T${hour}`;
}

/**
 * Export events from Amplitude for the previous complete hour
 */
async function exportLastHourEvents() {
    // Calculate timestamps for the previous complete hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const startTime = getAmplitudeTimestamp(twoHoursAgo);
    const endTime = getAmplitudeTimestamp(oneHourAgo);
    
    console.log(`Fetching data from ${startTime} to ${endTime} UTC (previous complete hour)`);
    
    // Create base64 encoded credentials
    const credentials = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');
    
    // Prepare the request
    const options = {
        hostname: 'amplitude.com',
        path: `/api/2/export?start=${startTime}&end=${endTime}`,
        method: 'GET',
        headers: {
            'Authorization': `Basic ${credentials}`
        }
    };
    
    // For EU residency server, use:
    // hostname: 'analytics.eu.amplitude.com'
    
    return new Promise((resolve, reject) => {
        const outputFile = `amplitude_export_${Date.now()}.zip`;
        const writeStream = fs.createWriteStream(outputFile);
        
        const req = https.request(options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            
            if (res.statusCode === 200) {
                res.pipe(writeStream);
                
                writeStream.on('finish', () => {
                    console.log(`Export complete. Data saved to ${outputFile}`);
                    resolve(outputFile);
                });
                
                writeStream.on('error', reject);
            } else if (res.statusCode === 404) {
                console.log('No data available for the specified time range.');
                resolve(null);
            } else if (res.statusCode === 400) {
                console.error('File size too large. Try a shorter time range.');
                reject(new Error('File size exceeded 4GB limit'));
            } else {
                let errorBody = '';
                res.on('data', chunk => errorBody += chunk);
                res.on('end', () => {
                    reject(new Error(`API Error ${res.statusCode}: ${errorBody}`));
                });
            }
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Filter page view events from exported data
 * Note: You'll need to unzip the file first and parse the JSON
 */
function filterPageViewEvents(jsonLine) {
    try {
        const event = JSON.parse(jsonLine);
        const eventType = event.event_type?.toLowerCase() || '';
        
        // Check if this is a page view event
        // Adjust these conditions based on your actual event naming
        if (eventType.includes('page') && eventType.includes('view') ||
            eventType === 'pageview' ||
            eventType === 'page_view' ||
            eventType === 'page view') {
            return event;
        }
    } catch (e) {
        // Skip malformed lines
    }
    return null;
}

// Main execution
(async () => {
    try {
        const exportedFile = await exportLastHourEvents();
        
        if (exportedFile) {
            console.log('\nTo extract and filter page view events:');
            console.log('1. Unzip the exported file');
            console.log('2. Parse each JSON file line by line');
            console.log('3. Filter for events where event_type contains "page view" or similar');
            
            // Example of how to process after unzipping (requires additional libraries like 'unzipper')
            console.log('\nExample filter code for processing unzipped JSON files:');
            console.log(`
import readline from 'readline';
const rl = readline.createInterface({
    input: fs.createReadStream('unzipped_file.json'),
    crlfDelay: Infinity
});

const pageViewEvents = [];
rl.on('line', (line) => {
    const event = filterPageViewEvents(line);
    if (event) {
        pageViewEvents.push(event);
    }
});
            `);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
    }
})();
