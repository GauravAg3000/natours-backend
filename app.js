const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");

// CREATING AN EXPRESS APPLICATION
const app = express();

console.log(process.env.NODE_ENV);

// SET SECURITY HTTP HEADERS
app.use(helmet());

// ATTACHING LOGGER MIDDLEWARE
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// LIMITING REQUESTS FROM SAME IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP. Please try again in an hour!",
});

app.use("/api", limiter);

// BODY PARSER MIDDLEWARE IN EXPRESS
app.use(express.json({ limit: "10kb" }));

// DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS ATTACKS
app.use(xss());

// DATA SANITIZATION AGAINST PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "difficulty",
      "maxGroupSize",
      "price",
    ],
  })
);

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
