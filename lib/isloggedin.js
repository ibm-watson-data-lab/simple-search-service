module.exports = function() {
    
  return function(req, res, next) {
    // is the user logged in check goes here
    if (typeof process.env.LOCKDOWN == "string" && process.env.LOCKDOWN == "true") {
      res.status(403).send({"ok": false, err: "Lockdown mode"});
    } else {
      next();
    }
  };
    
};