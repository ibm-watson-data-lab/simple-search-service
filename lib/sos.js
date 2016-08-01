//simple orchestration
module.exports = function() {

	return new require('simple-orchestration-js')({ 
    url: process.env.ETCD_URL,
    cert: process.env.ETCD_CERT
  })

}