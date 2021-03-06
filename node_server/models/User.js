var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;

var UserSchema = new mongoose.Schema({
	username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
	email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
	bio: String,
	image: String,
	favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article'}],
	following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
	hash: String,
	salt: String
}, { timestamps: true });


UserSchema.plugin(uniqueValidator, { message: 'is already taken'});

UserSchema.methods.setPassword = function(password){
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};


/*
* Check to see if the resulting hash matches the one that's stored in the database
*/

UserSchema.methods.validPassowrd = function(password){
	var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
	return this.hash === hash;
};

/*
* For the payload let's include id, username and exp (the unix timestamp in seconds to see when a token will expire)
*
*/
UserSchema.methods.generateJWT = function(){
	var today = new Date();
	var exp = new Date(today);
	exp.setDate(today.getDate() + 60);

	return jwt.sign({
		id: this._id,
		username: this.username,
		exp: parseInt(exp.getTime()/1000),
	}, secret);
};

/*
* Method on user model to get the JSONrep from front auth...
*/

UserSchema.methods.toAuthJSON = function(){
	return {
		username: this.username,
		email: this.email,
		token: this.generateJWT(),
		bio: this.bio,
		image: this.image
	};
};

//PUBLIC Profile method
UserSchema.methods.toProfileJSONFor = function(user){
	return {
		username: this.username,
		bio: this.bio,
		image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
		following: user ? user.isFollowing(this._id) : false
	};
};

//method for user to favorite an article

UserSchema.methods.favorite = function(id){
	if(this.favorites.indexOf(id) === -1 ){
		this.favorites.push(id);
	}

	return this.save();
};

//method for user to unfavorite an article

UserSchema.methods.unfavorite = function(id){
	this.favoites.remove( id );
	return this.save();
};

//method for frontend to show or not show a favorite
UserSchema.methods.isFavorite = function(id){
	return this.favorites.some(function(favoriteId){
		return favoriteId.toString() === id.toString();
	});
};

//method for following another user
UserSchema.methods.follow = function(id){
	if(this.following.indexOf(id) === -1 ){
		this.following.push(id);
	}

	return this.save();
};

////unfollowing method
UserSchema.methods.unfollow = function(id){
	this.following.remove(id);
	return this.save();
};

//check if following
UserSchema.methods.isFollowing = function(id){
	return this.following.some(function(followId){
		return followId.toString() === id.toString();
	});
};

mongoose.model('User', UserSchema);