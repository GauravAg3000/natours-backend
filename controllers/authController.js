const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get("host")}/login`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1)Check if email and passoword exist
  if (!email || !password) {
    const err = new AppError("Please enter email and password", 400);
    return next(err);
  }

  // 2)Check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");
  let correct = false;
  if (user) correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    const err = new AppError("Invalid UserEmail or Password", 401);
    return next(err);
  }

  // 3)if everything OK, send the token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1)Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
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
  res.locals.user = currentUser;
  next();
});

//Only for rendered pages
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // verify token
      const token = req.cookies.jwt;
      if (token === "loggedout") return next();

      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );

      // check if the user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  next();
};

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
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const err = new AppError(
      "There was an error sending the email. Try again Later!",
      500
    );
    return next(err);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1)Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2)If token has not expired, and there is a user, then sets the new Password
  if (!user) {
    const err = new AppError("Token is either expired or is invalid", 400);
    return next(err);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3)Update changedPassowordAt property for the user
  // 4)Log the user in and send the JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1)Get user from collection
  const user = await User.findById(req.user._id).select("+password");

  // 2)Check if the Posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    const err = new AppError("Your current password is wrong", 401);
    return next(err);
  }

  // 3)If yes, then update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4)Log the user in, send JWT
  createSendToken(user, 200, res);
});
