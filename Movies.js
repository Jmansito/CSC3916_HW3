let envPath = __dirname + "/../.env"
require('dotenv').config({path:envPath});
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise= global.Promise;

try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        //check for connection
        console.log("connected to movies"));
}catch (error) {
    console.log("could not connect to movies");
}
mongoose.set('useCreateIndex', true);

//Making movie schema with requirements for each parameter
var MovieSchema = new Schema({

    //Title of movie, string, must be a unique entry to avoid repeats
    // title:{type:String},
    title:{type:String,required:true,index:{unique:true}},
    //Year of the movie accepts a number since the dates were just a year
    year_Released:{type:Number, required:true},
    //Genre follows the requirements of the this list. May change to accept a string instead of this array in case there are other categories not on this list
    genre:{type:String,required:true,enum:['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Sci-Fi', 'Thriller', 'Western'] },
    actors: { type: [{actorName: String, actorCharacter: String}], required: true },
    imageUrl: {type: String, required: false},
    avg:{ type: Number, required:false}

});


module.exports = mongoose.model('movie',MovieSchema);