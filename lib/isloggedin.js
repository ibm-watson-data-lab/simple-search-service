module.exports = function() {
    
  return function(req, res, next) {
    // is the user logged in check goes here
    next();
  };
    
};