# Search Engine as-a Micro Service (seams)

Seams is an installable Bluemix app that creates a seach engine service with no code. On installation, seams uses:

* Node.js runtime
* a Cloudant database
* the IBM Datacache service

The seams user interface allows you to define the fields you would like to store and then provides a simple Content 
Management System to add/edit/delete data. The relevant fields are indexed automatically and a search API is presented 
on the `/search` endpoint, including:

* fielded search - ?q=colour:black+AND+brand:fender
* free-text search - ?q=black+fender+strat
* pagination 
* faceting
* caching of popular searches

