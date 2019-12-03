let fs = require('fs');
const metaFile = './meta.json';

let rawdata = fs.readFileSync(metaFile);
let meta = JSON.parse(rawdata);

var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('URI=file:./test.sqllite');
var db = new sqlite3.Database('./mm.db'); 
var mocapOrder = meta.mocapOrder;
var belongsTo = meta.belongsTo;
var diffMatrix = meta.diffMatrix;
var trajMatrix = meta.T;

var mocapOrderTableName = "mocapOrder";
var belongsToTableName = "belongsTo";
var diffTableName = "diff";
var trajTableName = "trajectories";

const insertMocapOrder = () => {
    db.serialize(function() {
      db.run("CREATE TABLE mocapOrder (fileName TEXT)");
        
        var stmt = db.prepare("INSERT INTO mocapOrder VALUES (?)");
        for (var i = 0; i < mocapOrder.length; i++) {
            stmt.run(mocapOrder[i]);
        }
    
        stmt.finalize();
        
        db.each("SELECT rowid AS id, fileName FROM mocapOrder", function(err, row) {
            console.log(row.id + ": " + row.fileName);
        });
    });        
};

const arrayToText = (arr) => {
    return arr.join("/");
};

const insertBelongsTo = () => {
    db.serialize(function() {
        db.run(`CREATE TABLE ${belongsToTableName} (value TEXT)`);
        
        var stmt = db.prepare(`INSERT INTO ${belongsToTableName} VALUES (?)`);

        for (var i = 0; i < belongsTo.length; i++) {
            var thingToStickIn = arrayToText(belongsTo[i]);
            stmt.run(thingToStickIn);
        }

        stmt.finalize();
        
        // db.each(`SELECT rowid AS id, value FROM ${belongsToTableName}`, function(err, row) {
        //     console.log(row.id + ": " + row.value);
        // });
    });        
};

const insertDij = () => {
    db.serialize(function() {
        db.run(`CREATE TABLE ${diffTableName} (value TEXT)`);
        
        var stmt = db.prepare(`INSERT INTO ${diffTableName} VALUES (?)`);

        for (var i = 0; i < diffMatrix.length; i++) {
            var thingToStickIn = arrayToText(diffMatrix[i]);
            stmt.run(thingToStickIn);
        }

        console.log(`finalizing shit`);
        stmt.finalize();
    });        
};

const insertTrajectories = () => {
    db.serialize(function() {
        db.run(`CREATE TABLE ${trajTableName} (value TEXT)`);
        
        var stmt = db.prepare(`INSERT INTO ${trajTableName} VALUES (?)`);

        for (var i = 0; i < trajMatrix.length; i++) {
            var asPairs = trajMatrix[i].map(v => {
                return v.map(n => `(${n[0]},${n[1]})`);
            });
            var thingToStickIn = arrayToText(asPairs);
            stmt.run(thingToStickIn);
        }

        console.log(`finalizing shit`);
        stmt.finalize();
    });        
};

insertMocapOrder();
insertBelongsTo();
insertDij();
insertTrajectories();

db.close();