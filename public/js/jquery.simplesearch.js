/**
 * jquery-simplesearch
 * 
 *  - jQuery object wrapping the SimpleSearchJS module.
 * 
 * example:
 * 
 *   var searchObj = $("#some-input-field").simpleSearch({
 *       serviceUrl: "http://a-simple-search-service-url.com",
 *       resultsTable: ".results-table-container",
 *       facetsList: "#resultfacets",
 *       onSuccess: function(results){ ... },
 *       onFail: function(error){ ... },
 *       onBefore: function(){ ... }
 *   });
 *  
 * a search is made automatically when ENTER key is pressed on the input field
 * in addition, the search can also be performed programmatically
 * 
 *   searchObj.simpleSearch("search", "*:*);  // search using passed query and default limit
 *   searchObj.simpleSearch("search", "*:*", 10);  // search using passed query and limit
 * 
 * the results table includes next/previous paging elements. however, paging can also
 * be programmatically called:
 * 
 *   searchObj.simpleSearch("page", "next");  //get the next page of results
 *   searchObj.simpleSearch("page", "prev");  //get the previous page of results
 *   
 */
(function($) {
  "user strict";
  
	$.fn.simpleSearch = function(options) {
		if (!options || typeof options === "object") {
			// creating a new instance
			return this.each(function() {
				if (!$.data(this, "plugin_SimpleSearch")) {
					$.data(this, "plugin_SimpleSearch", new SimpleSearchPlugin(this, (options || {})));
				}
			});
		}
		else if (typeof options === "string" && options[0] !== '_') {
			// calling a method
			var method = arguments[0];
			var args = Array.prototype.slice.call(arguments, 1);
			var returns = null;

			this.each(function() {
				var plugin = $.data(this, "plugin_SimpleSearch");

				if (plugin instanceof SimpleSearchPlugin && typeof plugin[method] === 'function') {
					returns = plugin[method].apply(plugin, args);
				}
			});

			return returns ? returns : this;
		}
	};

	function SimpleSearchPlugin(element, options) {
	  var opts = options || {};

	  var callbackFuncs = {
	      onSuccess: opts.onSuccess || function(){},
        onFail: opts.onFail || function(){},
        onBefore: opts.onBefore || function(){}
	  }

	  var containers = {
        resultsTable: opts.resultsTable,
        resultsList: opts.resultsList,
        facetsList: opts.facetsList,
        searchButton: opts.searchButton,
        inputField: element
	  }

	  this.simplesearch = new SimpleSearch(opts.serviceUrl, callbackFuncs, containers);
	};

	$.extend(SimpleSearchPlugin.prototype, {
		search: function(query, limit) {
		  this.simplesearch.search(query, limit);
		},

		page: function(action) {
		  if (action.toLowerCase() === "prev") {
		    this.simplesearch.prev();
		  }
		  else if (action.toLowerCase() === "next") {
        this.simplesearch.next();
      }
		},
	});
})(jQuery);
