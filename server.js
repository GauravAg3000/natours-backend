/* eslint-disable no-console */
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// UNCAUGHT_EXCEPTION ERROR HANDLER
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION!! SHUTING DOWN....");
  console.log(err.name, err.message);

  //Terminating the node process immediately
  process.exit(1);
});

// CONNECTING CONFIG.ENV FILE TO OUR NODE_PROCESS
dotenv.config({ path: "./config.env" });

// DATABASE CONNECTION STRING
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

// CONNECTING DATABASE WITH MONGOOSE
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection successful"));

const app = require("./app");

const port = process.env.PORT || 3000;

// STARTING OUR SERVER
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// UNHANDLED REJECTION ERROR HANDLER
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION!! SHUTING DOWN....");
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});
