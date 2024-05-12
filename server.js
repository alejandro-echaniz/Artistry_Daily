/* importning necessary libraries */ 
const express = require('express');
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();

