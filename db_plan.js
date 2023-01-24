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
var db_plan = new Client({
  // Need to set these config variables beforehand in Heroku environment settings
  // For more details, refer to https://devcenter.heroku.com/articles/config-vars
  user: process.env.PLANDB_USER,
  password: process.env.PLANDB_PASSWORD,
  database: "dfnn4oo2hfqh8e",
  port: 5432,
  host: "ec2-44-207-126-176.compute-1.amazonaws.com",
  ssl: { rejectUnauthorized: false }
}); 

db_plan.connect();

module.exports = db_plan;