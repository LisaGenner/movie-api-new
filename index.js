const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  uuid = require("uuid"),
  morgan = require("morgan"),
  mongoose = require("mongoose"),
  Models = require("./models.js"),
  cors = require("cors"), //New 2.10 code
  fs = require("fs"),
  path = require("path");
require("dotenv").config();

//2.4 cloud update//
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const tempPath = `/tmp/${fileName}`;
//

const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

//New 2.10 code, middleware to the routes that validate
const { check, validationResult } = require("express-validator");
//connecting to local host

mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//2.4 cloud update//
const fs = require("fs");
const fileUpload = require("express-fileupload");

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_SECRET,
  region: "us-east-1",
};
//

//2.4 cloud update//
const listObjectsParams = {
  Bucket: "newbucket2.3",
};

listObjectsCmd = new ListObjectsV2Command(listObjectsParams);
//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); //bodyParser middleware function
// app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("common")), app.use(express.static("public"));
app.use(cors()); //allow requests from all origins

// allow only certain origins to be given access
let allowedOrigins = [
  "http://localhost:5500",
  "https://myflix-20778.herokuapp.com",
  "https://myflix-20778.netlify.com",
];

let myLogger = (req, res, next) => {
  console.log(req.url);
  next();
};

app.use(myLogger);
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  {
    flags: "a",
  }
);

let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");

// GET requests_ok
app.get("/", (req, res) => {
  res.send("Welcome to MyFlix Movie App");
});

//to get movies_works
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);
// Get a movie title_works
app.get(
  "/movies/:Title",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // console.log(req.params.Title);
    Movies.findOne({ Title: req.params.Title })
      .then((movies) => {
        res.json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);
//get genre by movie
app.get(
  "/movies/genre/:genreName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Genre.Name": req.params.genreName })
      .then((movie) => {
        res.json(movie.Genre);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

//get director name and description_works
app.get(
  "/movies/director/:Name",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log(req.params.Title);
    Movies.findOne({ "Director.Name": req.params.Name })
      .then((movies) => {
        res.json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// Get a users_works
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  function (req, res) {
    Users.find()
      .then(function (users) {
        res.json(users);
      })
      .catch(function (err) {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// Get a users find one
app.get(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  function (req, res) {
    Users.findOne()
      .then(function (users) {
        res.json(users);
      })
      .catch(function (err) {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

//2.4 cloud update//
app.get("/images", (req, res) => {
  listObjectsParams = {
    Bucket: "newbucket2.3",
  };
  S3Client.send(new ListObjectsV2Command(listObjectsParams)).then(
    (listObjectsResponse) => {
      res.send(listObjectsResponse);
    }
  );
});
//

//Add user_new code for 2.10//
app.post(
  "/users",
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed"
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not apprear to be valid").isEmail(),
  ],
  (req, res) => {
    //check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((users) => {
        if (users) {
          return res.status(400).send(req.body.Username + "already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error" + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

//Update User/Put_works
app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed"
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not apprear to be valid").isEmail(),
  ],
  (req, res) => {
    //check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

// Add a movie to a user's list of favorites_works
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

//2.4 cloud update//
app.post("/images", (req, res) => {
  const file = req.files.image;
  const fileName = req.files.image.name;
  const tempPath = `/tmp/${fileName}`;
  file.mv(tempPath, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error: " + err);
    } else {
      res.json(updateimage);
    }
  });
});
//

// Delete a user by username_works
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then((users) => {
        if (!users) {
          res.status(400).send(req.params.Username + " was not found");
        } else {
          res.status(200).send(req.params.Username + " was deleted.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// Delete a movie by username_doesnt work
app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { FavoriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

app.get(
  "/documentation",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.sendFile("public/documentation.html", { root: __dirname });
  }
);

const port = process.env.PORT || 5500;
app.listen(port, "0.0.0.0", () => {
  console.log("Your app is listening on port" + port);
});
