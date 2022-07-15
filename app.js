const express = require("express");
const morgan = require("morgan");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");

// CREATING AN EXPRESS APPLICATION
const app = express();

console.log(process.env.NODE_ENV);

// ATTACHING LOGGER MIDDLEWARE TO OUR APP
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// BODY PARSER MIDDLEWARE IN EXPRESS
app.use(express.json());

// MIDDLEWARE FOR SERVING STATIC_FILES
app.use(express.static(`${__dirname}/public`));

// CUSTOM MIDDLEWARE
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES MIDDLEWARE
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);

app.all("*", (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on the server!`, 404);
  next(err);
});

// ATTACHING OUR GLOBAL ERROR MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
