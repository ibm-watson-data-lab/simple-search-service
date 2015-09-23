
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
				$scope.$root.renderPreview(function(err, html) {
					$('#preview').html(html);
	        	});
				break;
			case 'upload':
				$('#file').change(function () {
					$scope.$root.fileUploaded();
	        	});
				$scope.$root.getTotalRows(function(total) {
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
				$('#q').val("*:*");
	            $scope.$root.search();
				break;
			default:
				break;
		}
	}
]);

seamsApp.controller('seamsController', ['$scope', '$route', '$routeParams', '$location',
    function($scope, $route, $routeParams, $location) {
	    this.$route = $route;
	    this.$location = $location;
	    this.$routeParams = $routeParams;
	    
	    $scope.$root.currentUpload = null;

	    $scope.$root.ms = function() {
	      var d = new Date();
	      return d.getTime();
	    };

	    $scope.$root.search = function() {
	      var startTime = $scope.$root.ms();
	      $('#serps').html("");
	      $('#documents').html("");
	      $('#facets').html("");
	      
	      var q = $('#q').val();
	      $.ajax({
	        url: "/search",
	        data: { q: q},
	        dataType: "json"
	      }).done(function(x) {
	        var endTime = $scope.$root.ms();
	        $('#serps').show();
	        $('#facets').show();
	        $('#documents').show();
	        $('#searchheadings').show();
	        $('#searchtime').html(endTime - startTime + " ms");
	        $('#serps').html(JSON.stringify(x, null, " "));
	        $('#facets').html(JSON.stringify(x.counts, null, " "));

	        var html ="";
	        for(var i in x.rows) {
	          html += '<div class="alert alert-success alert-special" role="alert">';
	          html += JSON.stringify(x.rows[i], null, " ");
	          html += '</div>';
	        }
	        $('#documents').html(html);
	      }).fail(function(e) {
	        console.log(e);
	      });
	      return false;
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
	    	    location.href= "/";
	    	}).fail(function(e) {
	    	    console.log("delete error",e);
	    	});
	    }
	    
	    $scope.$root.getTotalRows = function(callback) {
	    	$.ajax({
	    		url: "/preview",
	    	    method: "get",
	    	    dataType: "json"
	    	}).done(function(x) {
		    	$scope.$root.currentStatus = x.total_rows > 0 ? "imported" : $scope.$root.currentStatus;
	    		if (callback) {
	    			callback(x.total_rows);
	    		}
	    	});
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
		              reply.fields[i].safename=reply.fields[i].name.toLowerCase().replace(/\W/g,"_");
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
		    	    	  $scope.$root.getTotalRows(function(total) {
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

		// given a schema object (x.fields) - this function returns the html
		// which displays a table of each field in the schema, its data type
	    // and whether its faceted or not, together with an example value from the 
		// uploaded file (x.data)
	    $scope.$root.renderSchema = function(x) {
		   var html = '<table class="table table-striped">\n';
		   html += '<input type="hidden" name="upload_id" id="upload_id" value="' + x.upload_id + '"/>\n';
		   html += "<tr>\n";
		   html += "  <th>name</th><th>type</th><th>facet</th><th>e.g</th>\n";
		   html += "</tr>\n"
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
		  var html = '<select name="' + n + '" + class="datatype" onchange="datatypechange(\'' + n +'\')">\n';
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
		  var html = '<input type="checkbox" value="true" name="' + n + '" id="' + n + '"';
		  if (t == "number" || t == "boolean") {
		    html += ' disabled="disabled"';
		  }
		  if (v == "true") {
		    html += ' checked="checked"';
		  }
		  html += ' />\n';
		  return html;
		};

		$scope.$root.removeDoc = function(id, arr) {
		  for(var i in arr) {
		    if(arr[i].id == id) {
		      arr.splice(i,1);
		      return arr;
		    }
		  }
		}

		$scope.$root.renderPreview = function(callback) {
		  var html = "";
		  $.ajax({
		    url: "/preview",
		    method: "get",
		    dataType: "json"
		  }).done(function(x) {
		    if (x.total_rows == 0 ) {
		      return callback(null, '<h3>0 documents</h3>');
		    }
		    $scope.$root.removeDoc("schema",x.rows);
		    $scope.$root.removeDoc("_design/search",x.rows);
		    html = '<h3>' + (x.total_rows - 2) + ' documents</h3>';
		    html += '<table class="table table-striped">\n';
		    html += "<tr>\n";
		    var schema = { fields: []};
		    for(var j in x.rows[0].doc) {
		      var field = j;
		      if (field != "_id" && field != "_rev") {     
		        html += "<th>\n";
		        html += field;
		        schema.fields.push({ name:field});
		        html += "</th>\n";
		      }
		    }
		    html += "</tr>\n";
		    for(var i in x.rows) {
		      var doc = x.rows[i].doc;
		      if (doc._id != "schema" && !doc._id.match(/^_design/)) {
		        html += "<tr>";
		      
		        for(var j in schema.fields) {
		          var field = schema.fields[j];
		          html += "<td>\n";
		          var val = doc[field.name];
		          if (typeof val == "undefined") {
		            val ="";
		          } else if (typeof val == "string") {
		            if (val.length > 20) {
		              val = val.substr(0,20) + "...";              
		            }
		          } else {
		            if (val) {
		              val = val.toString();
		            }
		          
		          }
		          html += val;
		          html += "</td>\n";
		        }
		        html += "</tr>\n";
		      }
		    }
		    html += "</table>\n";
		    callback(null,html);
		  });
		};
	    
	    $scope.$root.goToNextPage = function(page) {
	    	$location.path(page);
	    }

		$scope.$root.getTotalRows(function(total) {
	    	$scope.$root.$apply();
	    });
	}]
);

var datatypechange = function(e) {
  var d = $('select[name=' + e + ']');
  var v = d.val();
  if(v == "string" || v == "arrayofstrings") {
    $('input#' + e).prop("disabled", false);
  } else {
    $('input#' + e).prop("disabled", true);
  }
}
