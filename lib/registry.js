//simple orchestration
module.exports = function() {

	return new require('simple-service-registry')({ 
    url: process.env.ETCD_URL,
    strictSSL: false
  });

};