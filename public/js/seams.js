
var seamsApp = angular.module('seamsApp', ['ngRoute']);

seamsApp.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/:pathname', {
    	controller: 'navController',
    	templateUrl: function(stateParams) {
    		return 'templates/' + stateParams.pathname + '.html';
    	}
    })
  	.otherwise({
    	controller: 'navController',
  		templateUrl: 'templates/about.html'
  	});
}]);

seamsApp.controller('navController', ['$scope', '$route', '$routeParams',
    function($scope, $route, $routeParams) {
		$scope.$root.selectedView = $routeParams.pathname;

		switch($routeParams.pathname) {
			case 'api':
				if (!$scope.$root.dbschema) {
					$scope.$root.getCurrentSchema(function(err, data) {
						if (err) {
						    $scope.$root.dbschema = { fields: [] };
						}
					});
				}
				break;
			case 'upload':
				$('#remoteFileError').html("");
				$('#file').change(function () {
					$scope.$root.fileUploaded();
	        	});
				$scope.$root.getPreview(function(data) {
			    	$scope.$root.$apply();
			    });
				break;
			case 'import':
				if ($scope.$root.schema) {
					var html = $scope.$root.renderSchema($scope.$root.schema);
					$('#schemacontent').html(html);
				}
				break;
			case 'search':
				if (!$scope.$root.dbschema) {
					$scope.$root.getCurrentSchema(function(err, data) {
						if (err) {
						    $scope.$root.dbschema = { fields: [] };
						}
						$scope.$root.search();
					});
				}
				else {
					$scope.$root.search();
				}
				break;
			default:
				break;
		}
	}
]);

seamsApp.controller('seamsController', ['$scope', '$route', '$routeParams', '$location', '$http',
    function($scope, $route, $routeParams, $location, $http) {
	    this.$route = $route;
	    this.$location = $location;
	    this.$routeParams = $routeParams;

	    $scope.$root.currentUpload = null;
			$scope.$root.deleteDialogShown = false;

	    $scope.$root.ms = function() {
	      var d = new Date();
	      return d.getTime();
	    };

	    $scope.$root.search = function() {
	    	var q = $('#q').val();
	    	if (!q || q.length == 0) {
	    		$('#q').val("*:*");
	    		$('#q').val("*:*");
	    		q = "*:*";
	    	}
			$scope.$root.performSearch({
				q: q
			}, function(err, response) {
				$scope.$root.searchDocs = response;
			});

			return false;
	    }

	    $scope.$root.showDeleteDialog = function() {
	    	// $('#deleteData').show();
	    	$scope.$root.deleteDialogShown = true;
	    	// console.log('hello')
	    }

	    $scope.$root.deleteEverything = function() {
	    	// trigger the import
	    	$('#deletebutton').attr('disabled', true);
	    	$.ajax({
	    	    url: "/deleteeverything",
	    	    method: "post",
	    	    dataType: "json"
	    	}).done(function(x) {
	    		$scope.$root.currentUpload = null;
	    	    $('#deletefeedback').html("All of your data is gone.")
	    	    $scope.$root.deleteDialogShown = false;
	    	    location.href= "/";
	    	}).fail(function(e) {
	    	    console.log("delete error",e);
	    	});
	    }

	    $scope.$root.getPreview = function(callback) {
			$scope.$root.searching = true;
	    	$.ajax({
	    		url: "/preview",
	    	    method: "get",
	    	    dataType: "json"
	    	}).done(function(x) {
		    	$scope.$root.currentStatus = x.total_rows > 0 ? "imported" : $scope.$root.currentStatus;
		    	$scope.$root.previewData = x;
				$scope.$root.searching = false;
	    		if (callback) {
	    			callback(x);
	    		}
	    	});
	    };
	    
	    $scope.$root.fetchRemoteFile = function(fileUrl) {
	    	if (fileUrl) {
				$('#remoteFileError').html("");
			    $scope.$root.fetchingRemoteFile = true;
				$http.post("/fetch", {"url":fileUrl}, {json: true})
				  .success(function(data) {
					  if (data && data.fields && data.fields.length > 0) {
						  $('#fileuploadcontrol').hide();
				          $scope.$root.currentUpload = data;
				          for(var i in data.fields) {
				            data.fields[i].safename=data.fields[i].name.toLowerCase().replace(/\W/g,"_");
				          }
					      $scope.$root.currentStatus = "uploaded";
				          $scope.$root.schema = data;
				          $scope.$root.goToNextPage("import");
					  }
					  else {
						  $('#remoteFileError').html("No data was returned. Please check the URL and try again");
						    $scope.$root.fetchingRemoteFile = false;
					  }
				  })
				  .error(function(data, status, headers, config) {
					  console.log("/fetch failed:", data, status);
					  $('#remoteFileError').html("Failed to retreive the file. Please check the URL and try again");
					    $scope.$root.fetchingRemoteFile = false;
				  });
	    	}
	    };

	    $scope.$root.fileUploaded = function() {
	         $('#fileuploadcontrol').hide();
	         $('#uploadform').ajaxForm({
	             beforeSend: function() {
	                 $('#fileuploadprogress').html("0%");
	             },
	             uploadProgress: function(event, position, total, percentComplete) {
	                 var percentVal = percentComplete + '%';
	                 $('#fileuploadprogress').html(percentVal);
	                 console.log(percentVal);
	             },
	             success: function() {
	                 var percentVal = '100%';
	                 $('#fileuploadprogress').html("100% File successfully uploaded");
	             },
	             complete: function(xhr) {
		            var reply = JSON.parse(xhr.responseText);
		            $scope.$root.currentUpload = reply;
		            for(var i in reply.fields) {
		              reply.fields[i].safename=reply.fields[i].name.replace(/\W/g,"_");
		            }
			        $scope.$root.currentStatus = "uploaded";
		            $scope.$root.schema = reply;
		            $scope.$root.$apply();
		            $scope.$root.goToNextPage("import");
	         	}
	         }).submit();
	    }

	    // when the user has chosen their schema, they click the import button
	    // and this function is called. We fetch the schema by finding the values
	    // of the appropriate controls and sent it up to the server, which triggers
	    // the actual import process
	    $scope.$root.importClicked = function() {
	      console.log("IMPORT");
	      $('#importbutton').attr('disabled',true);
	      $('.import-spinner').css('display','inline-block');
	      var fields = [ ];
	      for(var i in $scope.$root.currentUpload.fields) {
	        var d = $('select[name=' + $scope.$root.currentUpload.fields[i].safename + ']');
	        var obj = {}
	        obj.name = d.attr('name');
	        obj.type = d.val();
	        obj.facet = ($('#' + d.attr('name')).is(':checked') && !$('#' + d.attr('name')).prop("disabled"));
	        fields.push(obj);
	      }
	      var schema = { fields: fields};

	      // trigger the import
	      $.ajax({
	        url: "/import",
	        method: "post",
	        data: { upload_id: $scope.$root.currentUpload.upload_id , schema: JSON.stringify(schema)},
	        dataType: "json"
	      }).done(function(x) {
	        $scope.$root.currentUpload = null;
	        console.log("import done");
	        setTimeout($scope.$root.pollStatus, 1000);
	      }).fail(function(e) {
	        console.log("import error",e);
	      });

	      console.log("SCHEMA",schema);
	    };

	    // check the progress of an import by polling GET /import/status every second
	    // until it completes
	    $scope.$root.pollStatus = function() {
	    	  $.ajax({
	    	    url: "/import/status?r="+Math.random(),
	    	    method: "get",
	    	    dataType: "json"
	    	  }).done(function(x) {
	    	    if(x) {
	    	      var html = x.total + " documents written";
	    	      $('#importstatus').html(html);

	    	      if (x.complete) {
	    	    	  setTimeout(function() {
		    	    	  $scope.$root.getPreview(function(data) {
		    	    	      $('.import-spinner').css('display','none');
		    	    	      $('#importstatus').html("COMPLETE! " + html);
		    	    	      $scope.$root.$apply();
		    	    	      $scope.$root.goToNextPage("search");
		    	  	      });
	    	    	  }, 1000);
	    	      }
	    	    }
	    	    if(!x || !x.complete) {
	    	      setTimeout($scope.$root.pollStatus, 1000);
	    	    }
	    	  }).fail(function(e) {
	    	    $('#importstatus').html("...");
	    	    setTimeout($scope.$root.pollStatus, 1000);
	    	  });
	    }

	    // Holding which panel in the "Preview Search" view
	    // is selected. Initially set to the HTML panel
    	$scope.currentSearchPanel = "html";

        // Holding which panel in the "Upload Data" view
        // is selected. Initially set to the File Upload panel
        $scope.currentUploadPanel = "fileupload";

		// given a schema object (x.fields) - this function returns the html
		// which displays a table of each field in the schema, its data type
	    // and whether its faceted or not, together with an example value from the
		// uploaded file (x.data)
	    $scope.$root.renderSchema = function(x) {
		   var html = '<table class="table_basic">\n';
		   html += '<input type="hidden" name="upload_id" id="upload_id" value="' + x.upload_id + '"/>\n';
		   html += "<thead>\n";
		   html += "  <th>name</th><th>type</th><th>facet</th><th>e.g</th>\n";
		   html += "</thead>\n"
		   for(var i in x.fields) {
		     html += "<tr>";
		     var f = x.fields[i];
		     html += "<td>" + f.name + "</td>\n";
		     html += "<td>" + $scope.$root.typeWidget(f.safename,f.type) + "</td>\n";
		     html += "<td>" + $scope.$root.facetWidget(f.safename,f.type,f.facet.toString()) + "</td>\n";
		     for(var j in x.data) {
		       var obj = x.data[j];
		       var val = obj[f.name];
		       if (typeof val == "undefined") {
		         val ="";
		       } else if (typeof val == "string") {
		         if (val.length > 20) {
		           val = val.substr(0,20) + "...";
		         }
		       } else {
		         val = val.toString();
		       }
		       html += "<td>";
		       html += val;
		       html += "</td>\n";
		       break; // just the one will do
		     }
		     html += "</tr>\n";
		   }
		   html += "</table>\n";
		   return html;
		};

		// returns the HTML to render a data type pull-down list
		// for field 'n' which has data type 't'
		$scope.$root.typeWidget = function(n,t) {
		  var html = '<select name="' + n + '" + class="input_select" onchange="datatypechange(\'' + n +'\')">\n';
		  var opts = [ "string", "number", "boolean", "arrayofstrings"];
		  for(var i in opts) {
		    var j = opts[i];
		    html += '<option value="' + j + '"';
		    if (j == t) {
		      html += ' selected="selected"';
		    }
		    html += '>' + j + '</option>\n';
		  }
		  html += '</select>\n';
		  return html;
		};

		// returns the HTML to render a checkbox for field 'n'
		// which is faceted or not (t)
		$scope.$root.facetWidget = function(n,t,v) {
		  var html = '<input class="input_checkbox" type="checkbox" value="true" name="' + n + '" id="' + n + '"';
		  if (t == "number" || t == "boolean") {
		    html += ' disabled="disabled"';
		  }
		  if (v == "true") {
		    html += ' checked="checked"';
		  }
		  html += ' /><label class="input_checkbox-handle" for="' + n + '"></label>\n';
		  return html;
		};

		$scope.$root.removeDoc = function(id, arr) {
		  for(var i in arr) {
		    if(arr[i].id == id) {
		      arr.splice(i,1);
		      return arr;
		    }
		  }
		};

		$scope.$root.apiExampleFacetSearch = function(callback) {
			var term = $scope.$root.getSearchQuery(true);
			if (term != null) {
				$scope.$root.performSearch({
					q: term.q
				}, function(err, response) {
					response.searchparams = term.params;
					callback(response);
				});
			}
		};

		$scope.$root.apiExampleTextSearch = function(callback) {
			var term = $scope.$root.getSearchQuery(false);
			if (term != null) {
				$scope.$root.performSearch({
					q: term.q.replace(/!/g, "\\!").replace(/:/g, "")
				}, function(err, response) {
					response.searchparams = term.params;
					callback(response);
				});
			}
		};

		$scope.$root.apiExampleLogicSearch = function(callback) {
			var term = null;
			var term1 = $scope.$root.getSearchQuery(true);
			var term2 = $scope.$root.getSearchQuery(false);
			var param1 = null;
			var param2 = null;

			if (term2 != null) {
				param2 = term2.params;
				term = "(\"" + term2.q.replace(/!/g, "\\!").replace(/:/g, "") + "\")";
			}
			if (term1 != null) {
				param1 = term1.params;
				if (term != null) {
					term += (" OR " + term1.q);
				}
				else {
					term = term1.q;
				}
			}
			if (term != null) {
				$scope.$root.performSearch({
					q: term
				}, function(err, response) {
					response.searchparams = [ param2, param1 ];
					callback(response);
				});
			}
		};

		$scope.$root.getSearchQuery = function(useFacet) {
			var previewData = $scope.$root.previewData;
			if (useFacet) {
				var facet = null;
				var params = null;
				var facetedfields = $scope.$root.dbschema.facetedfields || [];
				//perform faceted search
				if (facetedfields.length > 0) {
					var randomrow = 0;
					var fieldname = facetedfields[Math.floor(Math.random() * facetedfields.length)];
					for (var i=0; i<20; i++) {
						randomrow = Math.floor(Math.random() * previewData.rows.length);
						var text = previewData.rows[randomrow].doc[fieldname];
						if (text != null && typeof text !== 'undefined') {
							facet = fieldname + ":" + "\"" + text + "\"";
							params = {
								field: fieldname,
								value: text
							}
							break;
						}
					}
				}
				return {q: facet, params: params};
			}
			else {
				var text = null;
				var unfacetedfields = $scope.$root.dbschema.unfacetedfields || [];
				//perform text search
				if (unfacetedfields.length > 0) {
					var randomrow = 0;
					var fieldname = unfacetedfields[Math.floor(Math.random() * unfacetedfields.length)];
					for (var i=0; i<20; i++) {
						randomrow = Math.floor(Math.random() * previewData.rows.length);
						text = previewData.rows[randomrow].doc[fieldname];
						if (text != null && typeof text !== 'undefined' && text != "null") {
							text = text.split(" ", 2).join(" ");
							params = {
								field: "",
								value: text
							}
							break;
						}
					}
				}
				return {q: text, params: params};
			}
		};

		$scope.$root.getCurrentSchema = function(callback) {
			$scope.$root.searching = true;
			$http.get("/schema")
				.success(function(data) {
					$scope.$root.dbschema = data;

					var unfacetedfields = [];
					var facetedfields = [];
			        for(var i in data.fields) {
			        	if (data.fields[i].type === "string") {
			        		if (data.fields[i].facet == true) {
				                facetedfields.push(data.fields[i].name);
				            }
			        		else {
			        			unfacetedfields.push(data.fields[i].name);
				            }
			        	}
			        }

			        $scope.$root.dbschema.unfacetedfields = unfacetedfields;
			        $scope.$root.dbschema.facetedfields = facetedfields;

					$scope.$root.searching = false;
					callback(null, data);
				})
				.error(function(data, status, headers, config) {
				    console.log("Error retrieving schema:", data, status);

				    var error = {
				    	status: status,
				    	data: data
				    };

					callback(error)
				});
		};

		$scope.$root.getSettings = function () {
			var restapi = '/settings';
			$http.get(restapi)
			  .success(function(data) {
				  $scope.$root.settings = data;
			  })
			  .error(function(data, status, headers, config) {
			      console.log("Error retrieving settings:", data, status);
			      $scope.$root.settings = {};
			  });
		};

		$scope.$root.saveSettings = function () {
		    $scope.$root.saving = true;
			$http.post("/settings", $scope.$root.settings, {json: true})
			  .success(function(data) {
				  $scope.$root.settings = data;
				  $scope.$root.saving = false;
			  })
			  .error(function(data, status, headers, config) {
			      console.log("Error saving settings:", data, status);
			      $scope.$root.settings = $scope.$root.settings || {};
				  $scope.$root.saving = false;
			  });
		};

		$scope.$root.performSearch = function (params, callback) {
			var restapi = '/search?' + decodeURIComponent( $.param( params ) );
			var resturi = $location.protocol() + "://" + $location.host() + ($location.port() ? (':'+$location.port()) : '') + restapi;
			var startTime = $scope.$root.ms();
			$scope.$root.searching = true;

			$http.get(restapi)
			  .success(function(data) {
			      var results = {
			    	  rest_uri: resturi,
			    	  fields: [],
			    	  facets: [],
			    	  time: ($scope.$root.ms() - startTime),
			    	  data: data
			      };

			      var first = data.rows[0];

			      if (first) {
				      for(var field in first) {
					      if (field != "_id" && field != "_rev" && field != "_order") {
					        results.fields.push({ name: field, type: (typeof first[field] === "number" ? "number" : "string") });
					      }
					  }

				      for(var field in data.counts) {
					      results.facets.push({ name: field, type: (typeof first[field] === "number" ? "number" : "string") });
				      }
			      }

			      $scope.$root.searching = false;
			      callback(null, results);
			  })
			  .error( function(data, status, headers, config) {
			      console.log("Error performing search:", data, status);

			      var error = {
			    	  status: status,
			    	  data: data
			      };

			      var results = {
			    	  rest_uri: resturi,
			    	  fields: [],
			    	  facets: [],
			    	  data: data
			      };

			      $scope.$root.searching = false;
			      callback(error, results);
			  });
		};

	    $scope.$root.goToNextPage = function(page) {
	    	$location.path(page);
	    };

	    $scope.$root.getSettings();

		$scope.$root.getPreview(function(data) {
	    	$scope.$root.$apply();
	    });

		$scope.isArray = angular.isArray;

		$scope.toggle = function(domNodeId) {
			  if (domNodeId) {
				  var domNode = $("#" + domNodeId);
				  //expand
				  if (domNode && !domNode.is(":visible")) {
					  domNode.addClass("expanded");
					  domNode.slideToggle(500);
				  }
				  //collapse
				  else if (domNode && domNode.is(":visible")) {
					  domNode.slideToggle(500, function() {
						  domNode.removeClass("expanded");
					  });
				  }
			  }
		};

	}]
);

seamsApp.filter('ellipsize', function() {
	return function(text,length) {
		var ellipsize = text ? text : "";
		if (typeof text == "string") {
			if (ellipsize.length > length) {
				ellipsize = (ellipsize.substr(0, length) + "...");
			}
		}
		return ellipsize;
  }
});

seamsApp.filter('truncateUrl', function() {
	return function(uri, striphost) {
		var simplified = uri;
		if (typeof simplified == "string") {
			var start = simplified.indexOf("://");
			if (start > 0) {
				var end = simplified.indexOf('/', start+3);
				var host = simplified.indexOf('@');
				if (host < start+2) {
					host = start+2
				}
				if (host < end) {
					simplified = simplified.substring(0, start+3)
							   + (striphost ? "..." : '')
							   + simplified.substring(striphost ? end : host+1);
				}
			}
		}
		return simplified;
  }
});

seamsApp.directive('apiExample', function(){
	return {
	  restrict: 'A',
	  scope: {
		  apiExampleAction: '=apiexampleaction',
		  apiExampleTitle: '@apiexampletitle',
		  apiExampleTemplate: '@apiexampletemplate'
	  },
	  templateUrl: function( element, attr) {
	      return "/templates/" + (attr.apiexampletemplate || "apiexample.html");
	  },
	  replace: true,
	  link: function(scope, elem, attrs){
	      scope.apiExampleId = (new Date()).getTime();

	      scope.toggle = function() {
	    	  $('#'+scope.apiExampleId).collapse("toggle");
	      };

	      scope.$root.getCurrentSchema(function(err, data) {
			if (err) {
			    scope.$root.dbschema = { fields: [] };
			}
	    	if (!scope.apiExampleDocs) {
			    scope.apiExampleAction(function(response) {
			    	scope.apiExampleDocs = response;
			    });
	    	}
	      });
	  }
	};
});

seamsApp.directive('previewSearchHtml', function(){
	return {
	  restrict: 'A',
	  scope: true,
	  templateUrl: function( element, attrs) {
		  return "/templates/searchhtml.html";
	  },
	  replace: true,
	  link: function(scope, element, attrs) {

	      scope.apiSearch = function(key, value) {
	    	  if (typeof key != "undefined") {
		    	  var query = key;
		    	  if (value) {
		    		  query += ":\""+value+"\"";
		    		  var search = scope.searchString();

		    		  if (search.indexOf(query) > -1) {
		    	    	  query = search.replace(query, "").replace(" AND  AND ", " AND ");
		    		  }
		    		  else {
		    			  var regex = new RegExp(key+":\".*?\"", "i");

			    		  var facet = search.match(regex);
			    		  if (facet) {
			    			  query = search.replace(facet, query);
			    		  }
			    		  else {
			    			  query += (" AND " + search);
			    		  }
		    		  }

	    	    	  if (query.indexOf(" AND ") == 0) {
			    		  query = query.substring(query.indexOf(" AND ") + 5);
			    	  }
			    	  if (query.lastIndexOf(" AND ") != -1 && query.lastIndexOf(" AND ") == query.length - 5) {
			    		  query = query.substring(0, query.lastIndexOf(" AND "));
			    	  }
			    	  if (query.length == 0) {
	    	    		  query = "*:*";
	    	    	  }
		    	  }
		    	  else {
		    		  query = encodeURIComponent(query).replace(/!/g, "\\!");
		    	  }

		    	  if ($('#q')) {
		    		  $('#q').val(query);
		    	  }

		    	  scope.search();
	    	  }
		  };

		  scope.searchString = function() {
	    	  var search = scope.searchDocs.rest_uri;
	    	  search = search.substring(search.indexOf('?'));
	    	  var qIdx = search.indexOf("q=");
	    	  var aIdx = search.indexOf("&", qIdx);
	    	  if (qIdx > -1) {
	    		  search = search.substring(qIdx+2, (aIdx > -1 ? aIdx : search.length)).replace("*:*", "").replace(/\+AND\+/g, " AND ");
	    	  }
	    	  return decodeURIComponent(search);
		  };

		  scope.isSelected = function(facet, value) {
			  var q = facet + ":\"" + value + '\"';
	    	  return scope.searchDocs.rest_uri.indexOf(q) > -1;
		  };
	  }
	};
});

var datatypechange = function(e) {
  var d = $('select[name=' + e + ']');
  var v = d.val();
  if(v == "string" || v == "arrayofstrings") {
    $('input#' + e).prop("disabled", false);
  } else {
    $('input#' + e).prop("disabled", true);
  }
}
