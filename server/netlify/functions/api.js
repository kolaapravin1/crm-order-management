const serverless = require("serverless-http");

const app = require("../../app");
const connectDB = require("../../config/db");

let dbConnection;

const handler = async (event, context) => {
  // Reuse the connection between warm function invocations
  if (!dbConnection) {
    dbConnection = connectDB();
  }

  await dbConnection;

  return serverless(app)(event, context);
};

module.exports.handler = handler;
