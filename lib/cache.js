var request = require('request');

module.exports = function(opts) {

	if (opts === null) {
		return null;
	}

	if (opts.enabled === false) {
		return null;
	}

	if (!opts.host) {
		return null;
	}

	if (opts.enabled && opts.host) {

		const makeRequest = function(method, url, key, value, callback) {

			var params = {
				method: method,
				url: `${opts.host}/key/${key}`
			}

			if (method.toLowerCase() == "post" && value) {
				params.form = { value : JSON.stringify(value) }
			}

			request(params, function(e, r, b) {

				if (e) return callback(e);

				try {
					var body = JSON.parse(b);
				} catch (e) {
					var body = b;
				}

				if (body.success === false || !body.data) {
					return callback(true);
				}

				return callback(null, body.data);

			})

		}

		return {

			put: function(key, value, callback) {

				makeRequest("post", opts.host, key, value, callback)

			},

			get: function(key, callback) {

				makeRequest("get", opts.host, key, null, callback)

			},

			clearAll: function() {

				request({ url: `${opts.host}/clearall`, method: "POST"})

			},

			enabled: opts.enabled,

			host: opts.host

		}

	}

}