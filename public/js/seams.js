var schema = null;

var search = function() {
  var q = $('#q').val();
  $.ajax({
    url: "/search",
    data: { q: q},
    dataType: "json"
  }).done(function(x) {
    $('#serps').html(JSON.stringify(x, null, " "));
  }).fail(function(e) {
    console.log(e);
  });
  return false;
}

var populateSchema = function(cb) {
  $.ajax({
    url: "/schema",
    dataType: "json"
  }).done(function(x) {
    var html = '<table class="table table-striped">\n';
    html += "<tr>\n";
    html += "  <th>name</th><th>type</th><th>facet</th>\n";
    html += "</tr>\n"
    for(var i in x.fields) {
      html += "<tr>";
      var f = x.fields[i];
      html += "<td>" + f.name + "</td>\n";
      html += "<td>" + f.type + "</td>\n";
      html += "<td>" + f.facet + "</td>\n";
      html += "</tr>\n";
    }
    html += "</table>\n";
    $('#schemacontent').html(html);
    schema = x;
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

$( document ).ready(function() {
  
  populateSchema(function() {
      populateData();
  });

  
  // Handler for .ready() called.
});