/* importning necessary libraries */ 
const express = require('express');
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

app.use('/css', express.static(path.join(__dirname, 'css')));
app.set("views", path.resolve(__dirname, "templates"));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
const http = require("http");

const PORTNUMBER = process.env.PORT || 5005;
const URL_SUFFIX = '/full/843,/0/default.jpg';
let image_id, endpoint, description, title, artist;

/* || MONGODB CONNECTION */
// TODO


/* || AUXULIARY FUNCTIONS */
let ids = [];
let generatedID = NaN;
let paintingData; // datablock containing painting information through api req

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


getRandomID((err, randomId) => {
    if (err) {
        console.error(err);
        return;
    }
    generatedID = randomId;
});

async function getImageJson() {
    return new Promise((resolve, reject) => {
        getRandomID((err, randomId) => {
            if (err) {
                return reject(err);
            }
            let url = `https://api.artic.edu/api/v1/artworks/${randomId}?fields=id,title,artist_title,image_id,short_description`;
            fetch(url)
                .then(response => response.json())
                .then(json => resolve(json))
                .catch(error => reject(error));
        });
    });

}

async function setImage_id(json) {
    image_id = json.data.image_id;
    endpoint = json.config.iiif_url;
    description = json.data.short_description
    title = json.data.title;
    artist = json.data.artist_title;
}

async function getImageUrl() {
    let json = await getImageJson();
    setImage_id(json);
    let url = endpoint + "/" + image_id + URL_SUFFIX;
    return url;
}

async function loadPaintingData() {
    //need to load the image url
    const url = await getImageUrl();
    const image = `<img src="${url}" alt="Artwork from the Art Institute of Chicago">`;
    description = description === null ? `There is currently no description for this work :(` : description;
    
    const info = `<p>This work is from ${artist} and is titled ` +
        `"<em>${title}</em>".</p><p>${description}</p>`

    paintingData = {
        paintingTitle : title,
        paintingImage : image,
        paintingInformation : info,
    };
}


/* || EXPRESS CODE */
app.get("/", async (req, res) => {
    if (!paintingData) {
        await loadPaintingData();
    }
    res.render("index", paintingData);
});

app.post("/home", async (req, res) => {
    if (!paintingData) {
        await loadPaintingData();
    }

    // rendering information onto page
    res.render("home", paintingData)
})

/* running server locally */
process.stdin.setEncoding("utf8");
const greeting = `Web server started and running at ${PORTNUMBER}\n`;
const prompt = `Stop to shutdown the server: `;

process.stdout.write(greeting);
process.stdout.write(prompt);

process.stdin.on('readable', () => {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();

        // SHUTDOWN SERVER
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } 
        
        // WILD CARD: IMPROPER COMMAND
        else {
            console.log(`Invalid command: ${command}`);
            process.stdout.write(prompt);
        }
    }
    process.stdin.resume();
})

app.listen(PORTNUMBER);

// app.listen(PORTNUMBER, () => {
//     console.log(`Example app list∫∫ening on port ${PORTNUMBER}`)
// })