const { MongoClient } = require('mongodb');

const state = {
    db: null
};

// Async function to connect to the database
module.exports.connect = async function(done) {
    const url = 'mongodb://localhost:27017';
    const dbname = 'shopping';

    try {
        // Create MongoClient and connect to MongoDB
        const client = new MongoClient(url);
        await client.connect();

        // Store the database instance in state
        state.db = client.db(dbname);
        console.log(`Connected to MongoDB - Database: ${dbname}`);

        done();  // Notify that the connection was successful
    } catch (err) {
        console.log('Connection Error:', err);  // Log error
        done(err);  // Return the error through the callback
    }
};

// Method to get the connected database instance
module.exports.get = function() {
    return state.db;
};



