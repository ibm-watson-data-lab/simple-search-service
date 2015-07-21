var schema = null;


var ms = function() {
  var d = new Date();
  return d.getTime();
};

var search = function() {
  var startTime = ms();
  $('#serps').html("");
  var q = $('#q').val();
  $.ajax({
    url: "/search",
    data: { q: q},
    dataType: "json"
  }).done(function(x) {
    var endTime = ms();
    $('#searchtime').html(endTime - startTime + " ms");
    $('#serps').html(JSON.stringify(x, null, " "));
  }).fail(function(e) {
    console.log(e);
  });
  return false;
}

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

var facetWidget = function(n,t) {
  var html = '<input type="checkbox" value="true" name="'+n+'"';
  if (t == "true") {
    html += ' checked="checked"';
  }
  html += ' />\n';
  return html;
}

var renderSchema = function(x) {
  var html = '<table class="table table-striped">\n';
  html += "<tr>\n";
  html += "  <th>name</th><th>type</th><th>facet</th><th>e.g</th>\n";
  html += "</tr>\n"
  for(var i in x.fields) {
    html += "<tr>";
    var f = x.fields[i];
    html += "<td>" + f.name + "</td>\n";
    html += "<td>" + typeWidget(f.name,f.type) + "</td>\n";
    html += "<td>" + facetWidget(f.name,f.facet.toString()) + "</td>\n";
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

/* 

    var editor = ace.edit("schemacontent");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.setReadOnly(true);
    schema = x;

*/

function sendFile(formData) {
  $('#fileuploadprogress').html("");
  $.ajax({
    type: 'post',
    url: '/upload',
    data: formData,
    contentType: false,
    processData: false,
    success: function (reply) {
      // do something
  //    console.log(reply)
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
}

$( document ).ready(function() {
  

  // grab your file object from a file input
  $('#file').change(function () {
    var formData = new FormData();
    formData.append('file', $('#file')[0].files[0]); 
    sendFile(formData);
  });
});