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

const indexify = (arr) => {
    return arr.map((v, i) => {
        var obj = {};
        obj[i] = v;
        return obj;
    });
};

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
//   console.log(meta.belongsTo);
//   console.log(meta.mocapOrder);

  const belongsToIndexed = indexify(meta.belongsTo);
  const diffIndexed = indexify(meta.diffMatrix);

//   db.collection("meta").insertOne({mocapOrder: meta.mocapOrder}, (err, r) => {});
//   db.collection("meta").insertMany(belongsToIndexed, (err, r) => {
//       if (err) console.log(err);
//   });
//   db.collection("meta").insertOne({belongsTo: meta.belongsTo});

  db.collection(collectionName).insertMany(diffIndexed, (err, r) => {
      if (err) console.log(err);

    client.close();
  })
});
