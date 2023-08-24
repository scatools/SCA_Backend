///////////////////////////////////////////////////////////
//// Connection -- Database Settings and Configuration ////
///////////////////////////////////////////////////////////

const { Client } = require("pg");

// For development on local server

// var db = new Client({
//   user: "postgres",
//   password: "password",
//   database: "cpt",
//   port: 5432,
//   host: "localhost"
// });

// For production on Heroku

// Need to specify ssl attribute
let db = new Client({
  connectionString: process.env.HEROKU_POSTGRESQL_IVORY_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect();

module.exports = db;