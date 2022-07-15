const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const token = signToken(newUser._id);
  res.status(201).json({
    status: "success",
    token,
    data: {
      user: newUser,
    },
  });

  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1)Check if email and passoword exist
  if (!email || !password) {
    const err = new AppError("Please enter email and password", 400);
    return next(err);
  }

  // 2)Check if user exists and passowrd is correct
  const user = await User.findOne({ email }).select("+password");
  let correct = false;
  if (user) correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    const err = new AppError("Invalid UserEmail or Password", 401);
    return next(err);
  }

  // 3)if everything OK, send the token to client
  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1)Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    const err = new AppError(
      "You are not logged in! Please Login to get access",
      401
    );
    return next(err);
  }

  // 2)Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3)Check if the user still exists
  console.log(decoded.id);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    const err = new AppError(
      "The user belonging to this token no longer exist",
      401
    );
    return next(err);
  }

  // 4)Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    const err = new AppError(
      "User recently changed Password. Please Login Again!",
      401
    );
    return next(err);
  }

  //Granting access to the protected route as none of the above return a error
  req.user = currentUser;
  next();
});

// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new AppError(
        "You don't have permission to perform this action",
        403
      );
      return next(err);
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //Get user based on email provided
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    const err = new AppError("There is no user with this email address", 404);
    return next(err);
  }

  //Generate a random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  //Send it to user's mail
});

exports.resetPassword = (req, res, next) => {};
