const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'motionmatch';

// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  let thing1 = {manyArrayThing: [{foo: 1}, {bar: 234}], b: 2};
  let thing2 = {a: 2, b: 1};

  db.collection('inventory').insertMany([thing1, thing2], function(err, r) {
    assert.equal(null, err);
    assert.equal(2, r.insertedCount); 
  });

//   db.collection('inventory').find({}).toArray((err, doc) => {
//       console.log(doc);
//   });

//   const col = db.collection('findAndModify');
  // Insert multiple documents
//   col.insertMany([{a:1}, {a:2}, {a:2}], function(err, r) {
//     console.log(r.result);
//     assert.equal(null, err);
//     assert.equal(3, r.result.n);

    // Modify and return the modified document
    // col.findOneAndUpdate({a:1234}, {$set: {b: "DIS ME NO MORE A1"}}, {
        // returnOriginal: false,
        // upsert: true
    // }, function(err, r) {
    //   assert.equal(null, err);
    //   console.log(r);
    //   assert.equal(1, r.value.b);
    // });

    //   // Remove and return a document
    //   col.findOneAndDelete({a:2}, function(err, r) {
    //     assert.equal(null, err);
    //     assert.ok(r.value.b == null);
    //     client.close();
    //   });
    // });
//   });

  client.close();
});
