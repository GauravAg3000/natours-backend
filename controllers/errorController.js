const AppError = require("../utils/appError");

// HANDLING MONGOOSE VALIDATION ERROR
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// HANDLING DUPLICATE FIELDS ERROR
const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate Field Value: '${value}'. Please use another value`;

  return new AppError(message, 400);
};

// HANDLING CAST_ERROR
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// HANDLING JWT_ERROR
const handleJWTError = () =>
  new AppError("Invalid Token! Please Login Again!!", 401);

// HANDLING JWT_EXPIRED_ERROR
const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please Login Again!", 401);

// RESPONSE IN DEVELOPMENT MODE
const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error("ERROR", err);
    // RENDERED PAGE
    res.status(err.statusCode).render("error", {
      title: "Something Went Wrong!",
      msg: err.message,
    });
  }
};

// RESPONSE IN PRODUCTION MODE
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    // Operational Errors (trusted Errors)
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programming or other Unknown Errors
    console.error("ERROR", err);
    return res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message || "Something Went Wrong!",
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something Went Wrong!",
      msg: err.message,
    });
  }

  console.error("ERROR", err);
  return res.status(err.statusCode || 500).render("error", {
    title: "Something Went Wrong!",
    msg: "Please try again later!",
  });
};

// OUR GLOBAL ERROR HANDLING MIDDLEWARE
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    //Creating a new error from our AppError Class
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;

    if (error.name === "CastError") {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    }
    if (error.name === "JsonWebTokenError") {
      error = handleJWTError();
    }
    if (error.name === "TokenExpiredError") {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, req, res);
  }

  next();
};
