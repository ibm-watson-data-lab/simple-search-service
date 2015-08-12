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

## workflow

* call POST /upload passing the filename and type in, returns an id back for the next stage
* call GET /preview?id=x to get JSON of the inferred schema
* call GET /import to actually do the import

## Deploying to IBM Bluemix

The fastest way to deploy this application to Bluemix is to click the **Deploy to Bluemix** button below.

[![Deploy to Bluemix](https://bluemix.net/deploy/button_x2.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-cds-labs/seams)

**Don't have a Bluemix account?** If you haven't already, you'll be prompted to sign up for a Bluemix account when you click the button.  Sign up, verify your email address, then return here and click the the **Deploy to Bluemix** button again. Your new credentials let you deploy to the platform and also to code online with Bluemix and Git. If you have questions about working in Bluemix, find answers in the [Bluemix Docs](https://www.ng.bluemix.net/docs/).