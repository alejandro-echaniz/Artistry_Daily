/* importning necessary libraries */ 
const express = require('express');
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const NodeCache = require('node-cache');
const cache = new NodeCache();

app.use('/css', express.static(path.join(__dirname, 'css')));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

const PORTNUMBER = process.env.PORT || 5005;
const URL_SUFFIX = '/full/843,/0/default.jpg';
let image_id, endpoint, description, title, artist;
let lastFetchedDate = null; // date tracking purposes

// ===========================================================================

/* || MONGODB CONNECTION */
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_DB_COLLECTION;
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: db, collection:collection};
const uri = `mongodb+srv://${username}:${password}@cluster0.aurpqef.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Successfully connected to Mongo DB!");
    } catch (error) {
        console.error(`(ERROR) connecting to MongoDB server: ${error}`);
    } 
}
connectToMongoDB();

// INSERT USER
async function insertUser(client, databaseAndCollection, newUser) {
    try {
        const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .insertOne(newUser);

        console.log(`User entry created with id ${result.insertedId}`);
    } catch (error) {
        console.error(`(ERROR) inserting new user data into MongoDB: ${error}`)
    }
}

// FIND USER
async function findUser(client, databaseAndCollection, userEmail) {
    let filter = {email : userEmail};

    try {
        const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .findOne(filter);
        
        if (result) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error(`(ERROR) Finding user email in MongoDB: ${error}`)
        return null;
    }
}

async function updateRatings(client, databaseAndCollection, targetName, newRating){
    let filter = {email : targetName};
    let update = { $push : {ratings : newRating}};

    const result = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .updateOne(filter, update);
        
    console.log(`Documents modified: ${result.modifiedCount}`);
}

// ===========================================================================

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
    // Check if lastFetchedDate is not set or if it's a new day
    const currentDate = new Date();
    const isNewDay = !lastFetchedDate || lastFetchedDate.getDate() !== currentDate.getDate();

    if (!isNewDay) {
        // If it's not a new day, return the existing paintingData
        return paintingData;
    }

    //need to load the image url
    const url = await getImageUrl();
    const image = `<img src="${url}" alt="Artwork from the Art Institute of Chicago">`;
    description = description === null ? `There is currently no description for this work :(` : description;
    
    // formatting date
    const options = { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('en-US', options);
    
    
    const info = `<p>This work is from ${artist} and is titled ` +
        `"<em>${title}</em>".</p><p>${description}</p>`

    lastFetchedDate = currentDate;

    paintingData = {
        paintingTitle : title,
        date: formattedDate,
        paintingImage : image,
        paintingInformation : info,
    };
}

// ===========================================================================

/* || EXPRESS CODE */
app.use(express.urlencoded({ extended: true }));
app.get("/", async (req, res) => {
    if (!paintingData) {
        await loadPaintingData();
    }
    res.render("index", paintingData);
});

app.post("/", async (req, res) => {
    const ratingData = req.body.ratingRange;
    const favorited = req.body.isFavorite === "on";
    const targetEmail = cache.get("emailData");

    let rating = {
        "Artwork" : paintingData.paintingTitle, 
        "Artist" : artist,
        "Rating" : ratingData,
        "isFavorite" : favorited
    };

    updateRatings(client, databaseAndCollection, targetEmail, rating);

    res.redirect("/")
})

app.post("/home", async (req, res) => {
    const emailData = req.body.email;
    cache.set("emailData", emailData, 600);
    const passwordData = req.body.password;

    const result = await findUser(client, databaseAndCollection, emailData);
    if (result === false) {
        let userData = {email : emailData, password : passwordData, ratings : []};
        insertUser(client, databaseAndCollection, userData);
    }

    await loadPaintingData();
    res.render("home", paintingData);
})

/* || RUNNING SERVER */
app.listen(PORTNUMBER, () => {
    console.log(`Server running on PORT: ${PORTNUMBER}`)
})
