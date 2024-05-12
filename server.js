/* importning necessary libraries */ 
const express = require('express');
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

let ids = [];

// Function to get a random ID from the CSV file
function getRandomID(callback) {
    // Check if IDs are already loaded
    if (ids.length === 0) {
        const filePath = path.join(__dirname, 'data', 'someArtworks.csv');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }

            const lines = data.split('\n');
            const header = lines.shift();

            lines.forEach(line => {
                const fields = line.split(',');
                const id = parseInt(fields[0]);
                ids.push(id);
            });

            // Generate random ID and call callback
            const randomId = ids[Math.floor(Math.random() * ids.length)];
            callback(null, randomId);
        });
    } else {
        // IDs are already loaded, generate random ID and call callback
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        callback(null, randomId);
    }
}

let generatedID = NaN;

getRandomID((err, randomId) => {
    if (err) {
        console.error(err);
        return;
    }
    generatedID = randomId;
    console.log(generatedID);
});
