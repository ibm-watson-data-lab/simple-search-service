/**
 * SimpleSearchJS
 * 
 *  - JavaScript module for querying the Simple Search Service and generating
 *  HTML fragments from the JSON response.
 * 
 * example (dynamically):
 * 
 *   <input type="text"
 *       data-simple-search="http://a-simple-search-service-url.com"
 *       data-search-table=".results-table-container"
 *       data-search-facets="#resultfacets">
 * 
 * where the optional values of data-search-table and data-search-facets are selectors
 * to the DOM elements where the results table and facets list are to be inserted
 * 
 * example (programmatically):
 * 
 *   var searchUtil = SimpleSearch('http://a-simple-search-service-url.com', callbackFuncs, selectors);
 * 
 * the 'callbackFuncs' passed should be an object containing the callback functions to call
 * after a request has completed. three callback functions can be defined- onFail if the
 * request failed, onSucess if the request was successful, onBefore which is called before
 * search request begins:
 * 
 *   callbackFuncs = {
 *     onFail: function(error) { ... },
 *     onSuccess: function(results) { ... },
 *     onBefore: function() { ... }
 *   }
 *  
 * a search is made automatically when ENTER key is pressed on the input field.
 * in addition, the search can also be performed programmatically
 * 
 *   searchUtil.search('*:*');  // search using passed query and default limit
 *   searchUtil.search('*:*', 10);  // search using passed query and specified limit
 * 
 * the results table includes next/previous paging elements. however, paging can also
 * be programmatically called:
 * 
 *   searchUtil.next();
 *   searchUtil.prev();
 * 
 */
var SimpleSearch = function(serviceUrl, callbacks, containers) {
  'use strict';

  var url = serviceUrl || window.location.origin;
  var selectors = containers || {};
  var callbackFunc = callbacks || {};

  var paging = {
    query: '*:*',
    limit: null,
    bookmarks: [],
    hasMore: false
  };

  if (url.lastIndexOf('/') != url.length - 1) {
    url += '/';
  }

  var inputField = (typeof selectors.inputField === 'string') ? document.querySelector(selectors.inputField) : selectors.inputField;
  inputField.value = (inputField.value || (selectors.query ? selector.query : ''));
  
  var searchButton = false;
  if (selectors.searchButton === true || selectors.searchButton === 'true') {
    searchButton = 'simplesearch-button';
  }
  else if (typeof selectors.searchButton === 'string') {
    searchButton == selectors.searchButton;
  }
  
  var spinner = null;
  var reset = null;
  
  function initSpinner() {
    spinner = document.createElement('div');
    spinner.className = 'simplesearch-spinner';
    spinner.innerHTML = '&profline;';
    spinner.style.display = 'inline-block';
    spinner.style.margin = '5px';
    spinner.style.animationName = 'simpleSearchSpinner';
    spinner.style.animationDuration = '0.5s';
    spinner.style.animationTimingFunction = 'linear';
    spinner.style.animationIterationCount = 'infinite';

    // add keyframe styles for spinner to <HEAD>
    if (document.getElementById) {
      var style = '@-webkit-keyframes simpleSearchSpinner' +
        '{from{-webkit-transform:rotate(0deg);}to{-webkit-transform:rotate(360deg);}}' +
        '@-moz-keyframes simpleSearchSpinner' +
        '{from{-moz-transform:rotate(0deg);}to{-moz-transform:rotate(360deg);}}' +
        '@-ms-keyframes simpleSearchSpinner' +
        '{from{-ms-transform:rotate(0deg);}to{-ms-transform:rotate(360deg);}}';
      
      var st = document.createElement('style'); 
      st.setAttribute('id', 'simplesearch-style');
      st.innerHTML = style;
      document.getElementsByTagName('head')[0].appendChild(st);
    }
  };
  
  function initInputField() {
    if (inputField) {
      // set up input field reset button
      reset = document.createElement('div');
      reset.className = 'simplesearch-reset';
      reset.innerHTML = '&times;';
      reset.style.color = '#323232';
      reset.style.cursor = 'pointer';
      reset.style.display = 'inline-block';
      reset.style.left = '-1em';
      reset.style.margin = 'auto';
      reset.style.position = 'relative';
      reset.style.visibility = 'hidden';
      reset.setAttribute('tabindex', 0);
      reset.setAttribute('role', 'button');

      // perform search on Enter key press
      inputField.addEventListener('keydown', function(event) {
        var key = event.which || eevent.keyCode;
        if (key === 13 && inputField.value && inputField.value.length > 0) {
          event.preventDefault();
          search(inputField.value);
        }
      });

      // add input field reset button
      if (inputField.parentNode.querySelector('.simplesearch-reset') == null) {
        inputField.parentNode.insertBefore(reset, inputField.nextSibling);
      }

      reset.addEventListener('click', function(event) {
        event.preventDefault();
        reset.style.visibility = 'hidden';
        inputField.focus();
        search('*:*');
      });

      // perform search on Enter key press
      reset.addEventListener('keydown', function(event) {
        var key = event.which || eevent.keyCode;
        if (key === 13 && inputField.value && inputField.value.length > 0) {
          event.preventDefault();
          reset.style.visibility = 'hidden';
          inputField.focus();
          search('*:*');
        }
      });

      // show/hide input field reset button
      inputField.addEventListener('input', function(event) {
        var c = event.target.value !== '*:*';
        reset.style.visibility = (c ? 'initial' : 'hidden');
      });
      
      //  attach to search button click
      if (searchButton) {
        var button = document.querySelector(searchButton);
        // add input field reset button
        if (button == null) {
          button = document.createElement('button');
          button.className = searchButton;
          button.innerHTML = ' Search ';
          reset.parentNode.insertBefore(button, reset.nextSibling);
        }
        
        button.addEventListener('click', function() {
          search(inputField.value);
        });
      }
    }
  };

  function getSearchUrl(searchquery, options) {
    var q = null;
    var l = null;
    var b = null;
    var opts = (options || {});

    if (opts.bookmark) {
      q = paging.query;
      l = paging.limit;
      b = opts.bookmark
    }
    else {
      q = (searchquery || '*:*');
      l = opts.limit;

      // reset private variables
      paging.query = q;
      paging.limit = l;
      paging.bookmarks = [];
    }

    return url + 'search?q=' + q + 
            (l ? ('&limit=' + l) : '') + 
            (b ? ('&bookmark=' + b) : '');
  };

  function search(searchquery, options, fromPaging) {
    var q = fromPaging ? paging.query : searchquery;
    if (q) {
      var searchurl = getSearchUrl(q, options);

      var doneFunc = function(err, data) {
        if (err) {
          console.error(err);
          handleFail(err);
        }
        else {
          console.log(data);
          var response = xhrSuccess(data);

          response.rest_uri = searchurl;
          response.time = ((new Date()).getTime() - starttime);

          if (data.bookmark) {
            paging.bookmarks.push(data.bookmark);
          }
          
          if (!paging.limit) {
            paging.limit = data.rows.length;
          }

          paging.hasMore = data.total_rows > (paging.bookmarks.length * (paging.limit ? paging.limit : 1));

          response.paging = paging;

          handleSuccess(response, fromPaging);
        }
      };
      
      if (callbackFunc.onBefore) {
        callbackFunc.onBefore();
      }

      if (!fromPaging) {
        updateSearchUI(q);
      }
      
      var starttime = (new Date()).getTime();
      xhrSearch(searchurl, doneFunc);
    }
    else {
      handleFail({error: 'bad_request', reason: 'Missing search query'})
    }
  };

  function updateSearchUI(query) {
    if (query) {
      inputField.value = query;
    }

    for (var selector in selectors) {
      if (selector === 'resultsTable' || selector === 'resultsList' || selector === 'facetsList') {
        var container = document.querySelector(selectors[selector]);
        if (container) {
          while (container && container.firstChild) {
            container.removeChild(container.firstChild);
          }
          container.appendChild(spinner.cloneNode(true));
        }
      }
    }
  };

  function xhrSearch(searchurl, callback) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', searchurl, true);

    xmlhttp.onreadystatechange = function(e) {
      if (xmlhttp.readyState == 4) {
        if (xmlhttp.status == 200) {
          var response = JSON.parse(xmlhttp.responseText);
          callback(null, response);
        }
        else {
          callback({error: xmlhttp.status, reason: xmlhttp.statusText});
        }
      }
    };

    xmlhttp.send();
  }

  function xhrSuccess(data) {
    var first = data.rows[0];
    var results = {
      data: data,
      fields: [],
      facets: []
    };

    if (first) {
      for (var field in first) {
        if (field != '_id' && field != '_rev' && field != '_order') {
          results.fields.push({
            name: field,
            type: (typeof first[field] === 'number' ? 'number' : 'string')
          });
        }
      }

      for (var field in data.counts) {
        results.facets.push({
          name: field,
          type: (typeof first[field] === 'number' ? 'number' : 'string')
        });
      }
    }

    return results;
  }
  
  function performPaging(action) {
    if (selectors && selectors.resultsTable) {
      var container = document.querySelector(selectors.resultsTable);
      while (container && container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(spinner.cloneNode(true));
    }
    
    if (action.toLowerCase() === 'prev') {
      _prev();
    }
    else if (action.toLowerCase() === 'next') {
      _next();
    }
  };

  function handleFail(response) {
    var c = inputField.value !== '*:*';
    reset.style.visibility = (c ? 'initial' : 'hidden');

    for (var selector in selectors) {
      if (selector === 'resultsTable' || selector === 'resultsList' || selector === 'facetsList') {
        var container = document.querySelector(selectors[selector]);
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          if (selector !== 'facetsList') {
            container.innerHTML = ('Search Error: ' + response.responseText);
          }
        }
      }
    }

    if (callbackFunc.onFail) {
      callbackFunc.onFail(response);
    }
  };

  function handleSuccess(results, fromPaging) {
    var c = inputField.value !== '*:*';
    reset.style.visibility = (c ? 'initial' : 'hidden');

    if (selectors.resultsTable) {
      var resultsTable = formatAsTable(results.fields, results.data.rows, results.data.total_rows, results.paging);

      var container = document.querySelector(selectors.resultsTable);
      while (container && container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      container.appendChild(resultsTable);

      var prev = container.querySelector('.simplesearch-prev:not(.disabled)');
      if (prev) {
        prev.addEventListener('click', function() {
          performPaging('prev');
        });
      }

      var next = container.querySelector('.simplesearch-next:not(.disabled)');
      if (next) {
        next.addEventListener('click', function() {
          performPaging('next');
        });
      }
    };
    
    if (selectors.resultsList) {
      var container = document.querySelector(selectors.resultsList);
      if (container) {
        if (fromPaging) {
          // reached end of list, hide More button
          var last = (results.paging.bookmarks.length * results.paging.limit);
          if (last >= results.data.total_rows) {
            container.querySelector('.simplesearch-more').style.display = 'none';
          }
          
          // get formatted list items
          var list = container.querySelector('.simplesearch-list');
          var liwrapper = document.createElement('div');
          var rows = results.data.rows;
          
          for (var row in rows) {
            liwrapper.innerHTML = getListHTML(rows[row], results.fields);
            // append to existing list
            list.appendChild(liwrapper.firstChild);
          }
          
          // update count
          container.querySelector('.simplesearch-count').innerHTML = getCountHTML(results.data.total_rows, results.paging);
        }
        else {
          var resultsList = formatAsList(results.fields, results.data.rows, results.data.total_rows, results.paging);
  
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          container.appendChild(resultsList);
          
          var more = container.querySelector('.simplesearch-more');
          if (more) {
            more.addEventListener('click', function() {
              performPaging('next');
            });
          }
        }
      }
    }
    
    if (selectors.facetsList && !fromPaging) {
      var facetsList = getFacetsList(results.data.counts);

      var tagcloud = facetsList.querySelectorAll('.simplesearch-facet-value-name');
      for (var i = 0; i < tagcloud.length; i++) {
        tagcloud[i].addEventListener('click', function(event) {
          var query = sanitizeQuery(inputField.value, event.target.getAttribute('data-search-query'));
          search(query);
        });
      }

      var container = document.querySelector(selectors.facetsList);
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(facetsList);
      }
    }

    if (callbackFunc.onSuccess) {
      callbackFunc.onSuccess(results);
    }
  };

  function formatAsTable(fields, rows, total, paging) {
    var resultfields = '';
    var resultrows = '';
    
    for (var field in fields) {
      resultfields += '<th>' + fields[field].name + '</th>';
    }

    for (var row in rows) {
      resultrows += getRowHTML(rows[row], fields);
    }

    var tableHTML = getTablePagingHTML(paging.bookmarks.length-1, paging.limit, total) +
      '<table class="simplesearch-table">' +
      '<thead>' + resultfields +
      '</thead><tbody>' + resultrows +
      '</tbody></table>';

    var table = document.createElement('div');
    table.className = 'simplesearch-results-table';
    table.innerHTML = tableHTML;
    
    return table;
  };
  
  function getTablePagingHTML(page, limit, total) {
    var start = (page * limit) + 1;
    var end = start + limit - 1;

    if (start < 1) {
      start = 1;
    }

    if (total < 1) {
      start = 0;
    }

    if (end > total) {
      end = total;
    }

    if (start > end) {
      end = start;
    }

    var pagingDom = '<div class="simplesearch-count"><span>Showing ' + start + ' - ' + end + ' of ' + total + '</span></div>' +
      '<div class="simplesearch-paging"><button class="simplesearch-prev"' +
      (start <= 1 ? ' disabled' : '') +
      '>Prev</button> <button class="simplesearch-next"' +
      (end >= total ? ' disabled' : '') +
      '>Next</button></div>';

    return pagingDom;
  };

  function getRowHTML(row, fields) {
    var rowDom = '<tr class="simplesearch-result">';
    
    for (var field in fields) {
      var n = row[fields[field].name];
      if (Array.isArray(n) && n.length > 0) {
        rowDom += '<td><ul>';
        
        for (var l in n) {
          if (n[l]) {
            rowDom += '<li>' + n[l] + '</li>';
          }
        }
        
        rowDom += '</ul></td>';
      }
      else {
        rowDom += '<td><span>' + (n || '') + '</span></td>';
      }
    }
    
    rowDom += '</tr>';
    
    return rowDom;
  };

  function formatAsList(fields, rows, total, paging) {
    var resultlist = '';
    var start = ((paging.bookmarks.length-1) * paging.limit) + 1;
    var end = start + paging.limit - 1;
    
    if (start < 1) {
      start = 1;
    }
    
    if (total < 1) {
      start = 0;
    }
    
    if (end > total) {
      end = total;
    }
    
    if (start > end) {
      end = start;
    }
    
    for (var row in rows) {
      resultlist += getListHTML(rows[row], fields);
    }

    var listHTML = '<div class="simplesearch-count">' + getCountHTML(total, paging) + '</div>' +
      '<ul class="simplesearch-list">' + resultlist + '</ul>' +
      (end >= total ? '' : '<div class="simplesearch-paging"><button class="simplesearch-more">More</button>');

    var list = document.createElement('div');
    list.className = 'simplesearch-results-list';
    list.innerHTML = listHTML;
    
    return list;
  };

  function getListHTML(row, fields) {
    var listDom = '<li class="simplesearch-result">';
    listDom += '<dl>';

    for (var field in fields) {
      var n = row[fields[field].name];
      listDom += '<dt>' + fields[field].name + '</dt>';
      
      if (Array.isArray(n) && n.length > 0) {
        if (n.length > 1 || (n[0] && n[0].length > 0)) {
          for (var l in n) {
            listDom += '<dd>' + n[l] + '</dd>';
          }
        }
      }
      else if (n && n.length > 0) {
        listDom += '<dd>' + n + '</dd>';
      }

    }

    listDom += '</dl>';    
    listDom += '</li>';
    
    return listDom;
  };

  function getCountHTML(total, paging) {
    var start = ((paging.bookmarks.length-1) * paging.limit) + 1;
    var end = start + paging.limit - 1;

    if (start < 1) {
      start = 1;
    }

    if (total < 1) {
      start = 0;
    }

    if (end > total) {
      end = total;
    }

    if (start > end) {
      end = start;
    }

    return '<span>Showing ' + end + ' of ' + total + '</span>';
  };

  function getFacetsList(counts) {
    var facets = '';
    
    for (var countkey in counts) {
      var countvalue = counts[countkey];
      
      facets += '<div class="simplesearch-facet"><h4 class="simplesearch-facet-key">' + countkey + '</h4>';
      facets += '<ul class="simplesearch-facet-value-list">';
      
      for (var facetkey in countvalue) {
        facets += '<li class="simplesearch-facet-value">' +
          getFacetsHTML(facetkey, countvalue[facetkey], countkey) + '</li>';
      }
      
      facets += '</ul></div>';
    }

    var list = document.createElement('div');
    list.className = 'simplesearch-facets-list';
    list.innerHTML = facets;
    
    return list;
  };

  function getFacetsHTML(facetkey, facetvalue, countkey) {
    var k = countkey.indexOf(' ') == -1 ? countkey : ('"' + countkey + '"');
    var v = facetkey.indexOf(' ') == -1 ? facetkey : ('"' + facetkey + '"');
    
    return '<span class="simplesearch-facet-value-name" role="button" data-search-query=\'' +
      k + ':' + v + '\'>' +
      facetkey +
      '</span> <span class="simplesearch-facet-value-count">(' +
      facetvalue +
      ')</span>';
  };
  
  function sanitizeQuery(current, next) {
    var keyvalue = next.split(':');
    
    // add quotes if facet contains space and is not already quoted
    var query = (keyvalue[0].indexOf(' ') == -1 || keyvalue[0].indexOf('"') == 0) ? 
          keyvalue[0] : 
          ('"' + keyvalue[0] + '"');

    // add quotes if value contains space and is not already quoted
    if (keyvalue[1]) {
      query += ':';
      query += (keyvalue[1].indexOf(' ') == -1 || keyvalue[1].indexOf('"') == 0) ?
          keyvalue[1] :
          ('"' + keyvalue[1] + '"');
    }

    // remove search query if already exists
    // else append search query
    if (current.indexOf(query) > -1) {
      query = current.replace(query, '').replace(/((\sAND\s)+)/ig, ' AND ');
    }
    else if (current !== '*:*') {
      var regex = new RegExp(keyvalue[0] + ':\".*?\"', 'i');
      var facet = current.match(regex);

      if (facet) {
        query = current.replace(facet, query);
      }
      else {
        query += (' AND ' + current);
      }
    }

    query = query.trim();
    
    if (query.indexOf('AND') == 0) {
      query = query.substring(3);
    }
    
    if (query.lastIndexOf('AND') == query.length - 3) {
      query = query.substring(0, query.lastIndexOf('AND'));
    }
    
    if (query.length == 0) {
      query = '*:*';
    }
    
    return query.trim();
  };



  initSpinner();
  initInputField();
  
  function _search(query, limit) {
    search(query, {limit: limit});
  };
  
  function _next() {
    if (paging.bookmarks.length > 0 && paging.hasMore) {
      search(null, {bookmark: paging.bookmarks[paging.bookmarks.length - 1]}, true);
    }
    else if (callbackFunc.onFail) {
      callbackFunc.onFail({error: 'bad_request', reason: 'Page out of bounds: No next page'});
    }
  };
  
  function _prev() {
    if (paging.bookmarks.length > 1) {
      paging.bookmarks.splice(-2,2);
      if (paging.bookmarks.length > 0) {
        search(paging.query, {bookmark: paging.bookmarks[paging.bookmarks.length - 1]}, true);
      }
      else {
        search(paging.query, {limit: paging.limit});
      }
    }
    else if (callbackFunc.onFail) {
      callbackFunc.onFail({error: 'bad_request', reason: 'Page out of bounds: No prev page'});
    }
  };
  
  if (inputField && inputField.value) {
    search(inputField.value);
  }
  
  return {
    search: _search,
    next: _next,
    prev: _prev
  }
};


// find elements with  data-simple-search attributes and initiate them
(function() {
  window.addEventListener('DOMContentLoaded', function () {
    var inputs = document.querySelectorAll('[data-simple-search]');
    
    for (var i = 0; i < inputs.length; i++) {
      var node = inputs[i];
      var serviceUrl = node.getAttribute('data-simple-search');
      var containers = {
        resultsTable: node.getAttribute('data-search-table'),
        resultsList: node.getAttribute('data-search-list'),
        facetsList: node.getAttribute('data-search-facets'),
        inputField: node
      };
      
      new SimpleSearch(serviceUrl, null, containers);
    }
  });
}());
