let envPath = __dirname + "/../.env"
require('dotenv').config({path:envPath});
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise= global.Promise;

try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        //check for connection
        console.log("connected to reviews"));
}catch (error) {
    console.log("could not connect to reviews");
}
mongoose.set('useCreateIndex', true);

//Making review schema with requirements for each parameter
let ReviewSchema = new Schema({

    //id of the movie
    movieid:{type:mongoose.Types.ObjectId, required:true},
    //Review for the movie
    comment:{type:String, required:true},
    //Rating for the movie
    rating:{type:Number,required:true,min: 1, max: 5},
    //Name of reviewer
    name:{type:String,required:true}

});


module.exports = mongoose.model('reviews',ReviewSchema);