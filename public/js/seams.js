var schema = null,
  currentUpload=null;


var ms = function() {
  var d = new Date();
  return d.getTime();
};

var search = function() {
  var startTime = ms();
  $('#serps').html("");
  var q = $('#q').val();
  console.log("q",q);
  $.ajax({
    url: "/search",
    data: { q: q},
    dataType: "json"
  }).done(function(x) {
    console.log("searh results",x)
    var endTime = ms();
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


var deleteEverything= function() {
  // trigger the import
  $.ajax({
    url: "/deleteeverything",
    method: "post",
    dataType: "json"
  }).done(function(x) {
    currentUpload = null;
    console.log("delete done");
  }).fail(function(e) {
    console.log("delete error",e);
  });
}


/*
var populateSchema = function(cb) {
  $.ajax({
    url: "/schema",
    dataType: "json"
  }).done(function(x) {
    renderSchema(x);
    cb(null, x);
  }).fail(function(e) {
    cb(e,null);
  });
};

var populateData = function() {
  $.ajax({
    url: "/proxy/seams/_all_docs?include_docs=true",
    dataType: "json"
  }).done(function(x) {
    var html = '<table class="table table-striped">\n';
    html += "<tr>\n";
    for(var j in schema.fields) {
      var field = schema.fields[j];
      html += "<th>\n";
      html += field.name;
      html += "</th>\n";
    }
    html += "</tr>\n";
    for(var i in x.rows) {
      if (x.rows[i].id != "schema" && !x.rows[i].id.match(/^_design/)) {
        html += "<tr>";
        var doc = x.rows[i].doc;
      
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
            val = val.toString();
          }
          html += val;
          html += "</td>\n";
        }
        html += "</tr>\n";
      }
    }
    html += "</table>\n";
    
    $('#datacontent').html(html);
  });
}
*/

// returns the HTML to render a data type pull-down list
// for field 'n' which has data type 't'
var typeWidget = function(n,t) {
  var html = '<select name="' + n + '" + class="datatype">\n';
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
var facetWidget = function(n,t) {
  var html = '<input type="checkbox" value="true" name="' + n + '" id="' + n + '"';
  if (t == "true") {
    html += ' checked="checked"';
  }
  html += ' />\n';
  return html;
};

// given a schema object (x.fields) - this function returns the html
// which displays a table of each field in the schema, its data type
// and whether its faceted or not, together with an example value from the 
// uploaded file (x.data)
var renderSchema = function(x) {
  var html = '<table class="table table-striped">\n';
  html += '<input type="hidden" name="upload_id" id="upload_id" value="' + x.upload_id + '"/>\n';
  html += "<tr>\n";
  html += "  <th>name</th><th>type</th><th>facet</th><th>e.g</th>\n";
  html += "</tr>\n"
  for(var i in x.fields) {
    html += "<tr>";
    var f = x.fields[i];
    html += "<td>" + f.name + "</td>\n";
    html += "<td>" + typeWidget(f.safename,f.type) + "</td>\n";
    html += "<td>" + facetWidget(f.safename,f.facet.toString()) + "</td>\n";
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


// upload the attached file
// the server should return the schema JSON and the first three lines of the parsed file
// the schema can then be rendered by calling 'renderSchema' and we can open up the 
// second part of the accordion
var sendFile = function(formData) {
  $('#fileuploadprogress').html("");
  $.ajax({
    type: 'post',
    url: '/upload',
    data: formData,
    contentType: false,
    processData: false,
    success: function (reply) {
      // do something
      currentUpload = reply;
      for(var i in reply.fields) {
        reply.fields[i].safename=reply.fields[i].name.toLowerCase().replace(/\W/g,"_");
      }
      var html = renderSchema(reply);
      $('#collapseOne').collapse('hide');
      $('#collapseThree').collapse('hide');
      $('#collapseTwo').collapse('show');
      $('#schemacontent').html(html);
    },
    xhrFields: {
      onprogress: function (evt) {
        if(evt.lengthComputable) {
          if (evt.lengthComputable) {
            var percentComplete = evt.loaded / evt.total;
            percentComplete = parseInt(percentComplete * 100);
            $('#fileuploadprogress').html(percentComplete + "%");
          }
        } else {
          $('#fileuploadprogress').html("...");
        }
      }
    }
  });
};

var pollStatus = function() {
  $.ajax({
    url: "/import/status",
    method: "get",
    dataType: "json"
  }).done(function(x) {
    if(x) {
      var html = "";
      if(x.complete) {
        html = "COMPLETE! ";
        $('#collapseOne').collapse('hide');
        $('#collapseThree').collapse('show');
        $('#collapseTwo').collapse('hide');
      }
      html += x.total + " documents written";
      $('#importstatus').html(html);
      $('#importstatus2').html(html);
      
    }
    if(!x || !x.complete) {
      setTimeout(pollStatus, 1000);
    }
  }).fail(function(e) {
    $('#importstatus').html("...");
    setTimeout(pollStatus, 1000);
  });
}

// when the user has chosen their schema, they click the import button 
// and this functioin is called. We fetch the schema by finding the values
// of the appropriate controls and sent it up to the server, which triggers
// the actual import process
var importClicked = function() {
  console.log("IMPORT");
  $('#importbutton').attr('disabled',true);
  var fields = [ ];
  for(var i in currentUpload.fields) {
    var d = $('select[name=' + currentUpload.fields[i].safename);
    console.log(d);
    var obj = {}
    obj.name = d.attr('name');
    obj.type = d.val();
    obj.facet = $('#' + d.attr('name')).is(':checked');
    fields.push(obj);
  }
  schema = { fields: fields};
  
  // trigger the import
  $.ajax({
    url: "/import",
    method: "post",
    data: { upload_id: currentUpload.upload_id , schema: JSON.stringify(schema)},
    dataType: "json"
  }).done(function(x) {
    currentUpload = null;
    console.log("import done");
    pollStatus();

    
  }).fail(function(e) {
    console.log("import error",e);
  });
  

  
  console.log("SCHEMA",schema);
};

$( document ).ready(function() {
  

  // grab your file object from a file input
  $('#file').change(function () {
    var formData = new FormData();
    formData.append('file', $('#file')[0].files[0]); 
    sendFile(formData);
  });
});