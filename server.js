/*
CSC3916 HW3
File: Server.js
Description: Web API scaffolding for Movie API
 */

let envPath = __dirname + "/.env"
require('dotenv').config({path:envPath});
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movies = require('./Movies');
var Reviews = require('./Reviews');
const mongoose = require('mongoose');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();


function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code === 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

//post
router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });
    });
});

//routing for movies

router.route('/movies')
    //Post route to enter in and save a movie
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        const movie = new Movies();
        movie.title = req.body.title;
        movie.year_Released = req.body.year_Released;
        movie.genre = req.body.genre;
        movie.actorName = req.body.actorName;
        movie.actorCharacter = req.body.actorCharacter;
        movie.averageRating = req.body.averageRating;


        //Check if the movie is in the database, then make sure three actors are in the entry

        Movies.findOne({title: req.body.title}, function(err, found){
            //Throw error if error
            if(err){res.json({message: "Read error \n", error: err});}
            //if found then throw error, no repeats

            else if(found){res.json({message: "The movie you entered is already in the database\n"});}
            //Error if three actors are not entered per requirements
            else if (movie.actorName.length < 3 || movie.actorCharacter.length < 3 ){res.json({message: "Please enter in 3 actors\n"});}
            else{
                movie.save(function (err) {
                    if(err){res.json({message: "Please double check your entry, something was not entered correctly.\n", error: err});}

                    //Else, enter in the movie
                    else{res.json({message: "The movie has been saved to the database.\n"});}
                })
            }
        });
    })

    //GET route to find all movies
    .get(authJwtController.isAuthenticated, function (req, res) {
        Movies.find(function (err, movie) {
            let needReview= req.query.reviews;
            if(err) res.json({message: "Read Error. Sorry, please try again. \n", error: err});

            if(needReview ==="true"){
                Movies.aggregate([
                    {
                        $lookup:{
                            from:'reviews',
                            localField: '_id',
                            foreignField: 'movieid',
                            as: 'Movies_Reviews'
                        }
                    },
                    {
                        $sort : {avg:-1}
                    }

                ],function(err,data){
                    if(err){
                        res.send(err);
                    }else{
                        res.json(data);
                    }
                });
            }else {
                res.json(movie);
            }

        })
    })

    //DELETE route for removing a movie
    .delete(authJwtController.isAuthenticated, function (req, res){
        Movies.findOneAndDelete({title: req.body.title}, function (err, movie) {

            if (err) {res.status(400).json({message: "Read error. Sorry, please try again.\n", msg: err})}

            //If NULL then the movie is not there
            else if(movie == null) {res.json({msg : "The movie is not found"})}

            //Else, delete movie
            else
                res.json({msg :"Movie is deleted"})
        })
    });

//Next GET route for finding a movie by it's id
router.route('/movies/:movieid')

    //Required authentication for movie id.
    .get(authJwtController.isAuthenticated, function (req, res) {
        const id = req.params.movieid;
        let addReview= req.query.reviews;
        //doing a findById here to check the id. If found then send the user the movie, else, throw the error
        Movies.findById(id, function (err, movie) {

            //if the movie is not there, throw error
            if(err) res.json({message: "Read Error. Sorry, please try again. \n", error: err});

            //aggregate the movie and the review
            if(addReview === "true"){
                Movies.aggregate([
                    {

                    //Find the movie that matches the movieid parameter sent by user
                    $match: {'_id': mongoose.Types.ObjectId(req.params.movieid)}
                    },
                        {
                    //lookup aggregation
                    $lookup:
                        {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "movieid",
                            as: "movies_review"
                        }
                },
                   {
                       $sort: {avg: -1}
                   }

                ],
                    function (err, data) {if (err) {res.send(err);}

                    else {res.json(data);}
                }).exec

            }else{res.json(movie);}
        })
    });

//New route for PUT. Updating a movie
router.route('/movies/:id')

    //Required authentication for movie id
    .put(authJwtController.isAuthenticated, function (req, res) {
        const conditions = {_id: req.params.id};
        Movies.findOne({title: req.body.title}, function(err, found) {

            if (err) {res.json({message: "Read error, Please try again \n", error: err});}

            else if(found){res.json({message: "The movie you entered is already in the database\n"});}

            else {
                //using updateOne here
                Movies.updateOne(conditions, req.body)
                    .then(mov => {
                        if (!mov) {
                            return res.status(404).end();
                        }
                        return res.status(200).json({msg: "Movie is updated"})
                    })
                    .catch(err => console.log(err))
            }
        })
    });

//Routes for reviews
router.route('/reviews')

    //get looking for specific movie
    .get(authJwtController.isAuthenticated, function (req,res){
        console.log(req.body);


        Reviews.findOne({movieid: req.body.movieid}, function(err, review) {

            if (err) {res.json({message: "Read error, Please try again \n", error: err});}

            res.json(review);
        })
    })

    .post(authJwtController.isAuthenticated, function (req, res) {

        //console.log(req.body);
        let usertoken = req.headers.authorization;
        let token = usertoken.split(' ');
        let decoded = jwt.verify(token[1], process.env.SECRET_KEY);
        let id = req.body.movieid;

        Movies.findById(id, function(err, found) {
                if (err) {
                    res.json({message: "Read error, Please try again \n", error: err});
                } else if (found) {
                    const review = new Reviews();

                    review.name = decoded.username;
                    review.movieid = req.body.movieid;
                    review.comment = req.body.comment;
                    review.rating = req.body.rating;

                    review.save(function (err) {
                        if (err) {
                            res.json({message: "Please double check your entry, something was not entered correctly.", error: err});
                            }else {
                            Reviews.find({movieid: req.body.movieid}, function (err, all_Reviews) {
                                if (err) {
                                    res.status(404).json({message: "Read error."});
                                }
                            else
                               {
                                   let avg = 0;

                                   console.log(all_Reviews);
                                   all_Reviews.forEach(function(review){
                                       avg += review.rating;
                                       console.log(review);
                                   });
                                   avg = avg / all_Reviews.length;
                                   res.json({message: "The review has been saved to the database.\n"});}

                        })
                    }
                    })
                }
        })
    });

//All other routes and methods will throw error

router.all('*', function(req, res) {
    res.json({
        error: 'Your HTTP method is not supported and requires a fix.'
    });
});


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


