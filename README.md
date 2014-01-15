# jsDAVlib - A Distributed Authoring and Versioning library in pure JavaScript

## Introduction

This project aims to implement a DAV (WebDAV, CardDAV and CalDAV) library in JavaScript to be used primary in FirefoxOS but can be used in any browser.

If you plan to use this outside FirefoxOS, you should consider that your server should support CORS since XHR didn't allow you to connect to it.

## Current status

Currently this library only supports a read-only vision of the server but I'll implement write operations very soon.

Another limitation is that recovered files should only be text ones. In the future, binary support will be implemented.

## Components

Code and library is divided into different modules:

### jsDAVlib

This is the main object. This is a singlenton object and is publicy available through window.jsDAVlib

This object will act as a factory for your first connection and is responsible to manage all communications with the server (XHR)

#### Public methods

  * jsDAVConnection = getConnection(parameters)

  Returns a new jsDAVConnection based on the received parameteres. This parameters SHALL be a JSON document with this format:

  ```
  {
    url: <DAV server URL>,
    user: <DAV server User>,
    password: <DAV server Password>
  }
  ```

#### Private methods

  * checkRepository
  * getResource

Both used by jsDAVConnection to manage server connections

### jsDAVConnection

This object represents a connection. This object will store the connection parameters and cache the rootResource

#### Public methods

  * onready - This event will inform as soon as the connection is correctly initiated (a root resource is available)

  * onerror - This event will be fired if the server is not DAV compatible or in any other error cause

  * isAddressBook() - This method will return true or false if the server informs that is an AddressBook (CardDAV compatible) extension

  * isCalendar() - This method will return true or false if the server informs that is a Calendar (CalDAV compatible) extension

  * getInfo() - This method returns generic information of the server like URL, last modified time, is a DAV server, is an AddressBook and is a Calendar.

  * getResource(resourceURL, callback)

  This method is used to recover a new resource through this connection (the resource will be received in the callback method).

  First argument is the resource URL, recovered from the jsDAVResource (href attributes)

  If resourceURL === null, the cached rootResource will be returned.

### jsDAVResource

This object represents a DAV resource (Collection and files). Through this object you can retrieve the file contents, collection contents, metadata, ...

#### Public methods

  * addFileContents() - This method is used to add file contents. Will be used by jsDAVlib when a file is recovered and by the user to modify the contents of the file.

  * isFile() - This method is used to check if the resource is a file

  * isCollection() - This method is used to check if the resource is a collection

  * isAddressBook() - This method is used to check if the collection has the addressbook attribute

  * isCalendar() - This method is used to check if the collection has the calendar attribute

  * isException() - This method is used to check if we had some errors while parsing

  * getExceptionInfo() - This method is used to get exception details (TBD)

  * getMetadata() - This method is used to recover metadata (href, mime, size and )

  * getFileContents() - This method is used to recover file contents (added by addFileContents)

  * getCollectionContents() - This method is used to recover directory/collection contents

  * get() - This method is a friendly way to recover metadata and file or collection contents

### jsDAVXMLParser

This object is responsible of parse the DAV XML documents received by the server.

#### Private methods

  * parse() - This method receives a XML DAV document to parse. This will return a JSON object with all the XML required information.

  * getQueryXML() - This method returns the XML needed in DAV PROPFIND requests.

## How to use

* Include in your index.html these libraries:

```html
<head>
  ...
  <script src="src/jsDAVXMLParser.js"></script>
  <script src="src/jsDAVResource.js"></script>
  <script src="src/jsDAVConnection.js"></script>
  <script src="src/jsDAVlib.js"></script>
  ...
</head>
```

* After that, in your JS code you will interact with the library in this way:

```javascript
var myDAVServer = jsDAVlib.getConnection({
  url: 'https://my.server.com/webdav/contacts',
  user: 'me',
  password: '1234567890'
});

myDAVServer.onready = function() {
  // Yeah! a correct DAV connection is DONE

  myDAVServer.getResource(null, function(resource, error) {
    console.log('Root Resource: ' + JSON.stringify(resource.get()));

    var data = resource.get();

    // Recover first child element
    if (data.meta.type.type === 'dir') {
      myDAVServer.getResource(data.data[0].href, function(res, error) {
        // Resource recovered . . .
        if (data.meta.type.type === 'file' && data.meta.mime === 'text/x-vcard; charset=utf-8') {
          // data.data contents is a VCARD file !
        }
      });
    }
  });
}
```
