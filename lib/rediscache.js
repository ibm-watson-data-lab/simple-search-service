module.exports = function(credentials) {

  var bits = credentials.public_hostname.split(":"),
      password = (credentials.password)? credentials.password: null;
      client = require("redis").createClient(bits[1], bits[0], { auth_pass: password});
      
  var retval =  {
        
    put: function(key, value, callback) {
      client.setex(key, 60*60, JSON.stringify(value), callback);
    },
    
    get: function(key, callback) {
      client.get(key, function(err, data) {
        var rep = null;
        if (!err) {
          rep = JSON.parse(data);
        }
        callback( (err || rep==null) , rep);
      });
    },
    
    remove: function(key, callback) {
      client.del(key, callback)
    },
    
    clearAll: function() {
      client.flushall(function(err,data) {
        
      });
    }
  
  };
  
  return retval;
  
};


