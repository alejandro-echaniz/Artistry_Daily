/* importning necessary libraries */ 
const express = require('express');
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

const URL_SUFFIX = '/full/843,/0/default.jpg';
let image_id, endpoint;


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

async function getImageJson() {
    return new Promise((resolve, reject) => {
        getRandomID((err, randomId) => {
            if (err) {
                return reject(err);
            }
            let url = `https://api.artic.edu/api/v1/artworks/${randomId}?fields=id,title,image_id,short_description`;
            fetch(url)
                .then(response => response.json())
                .then(json => resolve(json))
                .catch(error => reject(error));
        });
    });

}

function setImage_id(json) {
    image_id = json.data.image_id;
    endpoint = json.config.iiif_url;
}

async function getImageUrl() {
    let json = await getImageJson();
    setImage_id(json);
    let url = endpoint + "/" + image_id + URL_SUFFIX;
    return url;
}

async function main() {
    try {
        let bla = await getImageUrl();
        console.log(bla);
    } catch (e) { /* To see catch action, rename URL to invalid name */
      console.log("\n***** ERROR Retrieving EnglishSpanish *****\n" + e);
    }
  }
  
  main();


