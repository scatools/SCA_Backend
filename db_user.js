const { Client } = require("pg");

// For development on local server

// var db_user = new Client({
//   user: "postgres",
//   password: "password",
//   database: "user",
//   port: 5432,
//   host: "localhost"
// });

// For production on Heroku

// Need to specify ssl attribute
let db_user = new Client({
  connectionString: process.env.HEROKU_POSTGRESQL_PUCE_URL,
  ssl: { rejectUnauthorized: false }
});

db_user.connect();

module.exports = db_user;