var request = require('request'),
		async 	= require('async'),
		db 			=	require('./db.js'),
		cfenv = require('cfenv'),
    appEnv = cfenv.getAppEnv();

var populate = function(service) {

	// if we have no service
	// return
	if (service.enabled === false) {
		return;
	}

	db.dbSchema(function(err, schema) {

		if (err) {
			return console.log(err);
		}

		var actions = {};
		schema.fields.filter(f => f.facet).forEach(f => {
			
			var name = `sss_${f.name}`

			actions[name] = function(callback) {

				var opts = {
					url: `${service.host}/api/${name}`,
					formData: {
						name: name,
						url: `${appEnv.url}/autocompletes/${f.name}`
					}
				}

				request.post(opts, function(err, res, body) {
					return callback()
				})

			}

		})

		async.series(actions, function(err, results) {

			console.log("autocompletes done");

		})

	})
		
}

var append = function(data, service) {

	// if we have no service
	// return
	if (service.enabled === false) {
		return;
	}

	db.dbSchema(function(err, schema) {

		if (err) {
			return console.log(err);
		}

		var actions = {};
		schema.fields.filter(f => f.facet).forEach(f => {
			
			if (!data[f.name]) return false;

			actions[f.name] = function(callback) {

				var opts = {
					url: `${service.host}/api/${f.name}`,
					json: {
						term: data[f.name]
					}
				}

				request.put(opts, function(err, res, body) {
					return callback(err, body)
				})

			}

		});

		async.series(actions, function(err, results) {

			if (err) return console.log(err);

			console.log("autocomplete appended");
			console.log(results);

		})

	})

}

module.exports = {
	populate: populate,
	append: append
}