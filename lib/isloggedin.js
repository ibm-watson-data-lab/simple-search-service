var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy,
    AnonymousStrategy = require('passport-anonymous');

// whch strategy do we want to use?
var strategyName = ( (typeof process.env.LOCKDOWN === 'string' && process.env.LOCKDOWN === 'true') ? 'basic' : 'anonymous' );

// return our chosen strategy
var passportStrategy = function() {
  
  // Lockdown is not set, or is not true - let anyone in
	if (strategyName === "anonymous") {
		return new AnonymousStrategy();
	}

	// lockdown is true, we need to restrict to a known username/password
  return new BasicStrategy(
	  function(userid, password, done) {

	  	// Lockdown variables are not set
	  	// invalid user
	  	if (typeof process.env.SSS_LOCKDOWN_USERNAME !== 'string' || typeof process.env.SSS_LOCKDOWN_PASSWORD !== 'string') {
	  		return done(null, false);
	  	}

	  	// supplied username/password don't match
	  	// invalid user
	    if (userid !== process.env.SSS_LOCKDOWN_USERNAME || password !== process.env.SSS_LOCKDOWN_PASSWORD) { 
	    	return done(null, false);
	    }

	    // valid user
	    return done(null, { authenticated: true });
	  }
	);
    
};

module.exports = {
	passportStrategy: passportStrategy,
	auth: passport.authenticate(strategyName, { session: false })
};