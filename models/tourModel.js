const mongoose = require("mongoose");
// const slugify = require("slugify");
// const validator = require("validator");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a `name`"],
      unique: true,
      trim: true,
      maxLength: [40, "A tour name must have less than equal to 40 characters"],
      minLength: [10, "A tour name must have more than equal to 10 characters"],
      // validate: [validator.isAlpha, "A tour name must contain only characters"],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a `duration`"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a `group size`"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a `difficulty`"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "{VALUE} is not a difficulty",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a `price`"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below the regular price",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a `summary`"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a `cover image`"],
    },
    image: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

// CREATING A VIRTUAL PROPERTY (FIELD)
tourSchema.virtual("durationWeeks").get(function () {
  if (this.duration) return +(this.duration / 7).toFixed(2);
});

// DOCUMENT MIDDLEWARE
// tourSchema.pre("save", function (next) {
//   this.slug = slugify(this.name, { lower: true });
//   next();
// });

// tourSchema.post("save", function (doc, next) {
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(docs);
//   next();
// });

//AGGREGATION MIDDLEWARE
tourSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });
  next();
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
