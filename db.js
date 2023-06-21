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
var db = new Client({
  // Need to set these config variables beforehand in Heroku environment settings
  // For more details, refer to https://devcenter.heroku.com/articles/config-vars
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: "dasc1l6ep0r19a",
  port: 5432,
  host: "ec2-35-172-26-41.compute-1.amazonaws.com",
  ssl: { rejectUnauthorized: false }
}); 

db.connect();

module.exports = db;