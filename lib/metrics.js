var request = require('request');

module.exports = function(opts) {

	if (opts === null || typeof opts === "undefined") {
		return null;
	}

	if (opts.enabled === false) {
		return null;
	}

	if (!opts.host) {
		return null;
	}

	if (opts.enabled && opts.host) {

		return function(values, callback) {

			// create a query string out of an object
			var query = Object.keys(values).reduce((p, c) => {
				p.push(`${c}=${values[c]}`)
				return p;
			}, []).join("&");

			var params = {
				method: "GET",
				url: `${opts.host}?${query}`
			}

			request(params, function(e, r, b) {

				if (typeof callback === "function") {
					if (e) return callback(e);
					return callback(null);
				}

			})

		}

	}

	return null;

}