const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'motionmatch';
const collectionName = 'indexToClipFrame';
const metaFile = './meta.json';
const fs = require('fs');

let rawdata = fs.readFileSync(metaFile);
let meta = JSON.parse(rawdata);

// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  db.collection("meta").find({mocapOrder: { $exists: true }}).toArray((err, r) => {
      console.log(r);
  });

  client.close();
});
