define('jsDAVlib', function() {
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';


var jsDAVlib;

(function () {
  jsDAVlib = {
    getConnection: function getConnection(params) {
      return new jsDAVConnection(params);
    },
    debug: function jsDAVDebug(msg, obj) {
      if (obj) {
        msg = msg + ': ' + JSON.stringify(obj);
      }
      console.log('DEBUG jsDAVlib: ' + (new Date()).getTime() + ' - ' + msg);
    }
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.comms = (function jsDAVCommunications() {

  // Helpers
  function getXHR() {
    return new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });
  }

  // Callback with DAV server properties
  function checkDAVrepository(DAVConnection, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};
    var xhr = getXHR();

    xhr.onload = function checkDAVrepositoryResponse() {
      callback({
        DAV: xhr.getResponseHeader('DAV'),
        Allow: xhr.getResponseHeader('Allow')
      });
    };

    xhr.open('OPTIONS', DAVConnection.params.url, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.withCredentials = true;

    try {
      xhr.send();
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function getDAVResourceInfo(DAVConnection, resURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};
    var xhr = getXHR();

    xhr.onload = function getDAVResourceInfoResponse() {
      // We SHALL receive a MULTISTATUS response (207) // See RFC 4918
      if (xhr.status != 207 || !xhr.responseXML) {
        return callback(null, 'No valid DAV XML Response');
      }
      var DAVResource = new jsDAVlib.DAVResource(xhr.responseXML);
      if (DAVResource.isException()) {
        return callback(null, DAVResource.getExceptionInfo());
      }

      if (resURL === '' || resURL === DAVConnection.getInfo().rootFolder) {
        DAVResource.setParent(null);
      } else {
        var _path = resURL.split('/');
        if (_path.pop() === '') {
          _path.pop();
          _path.push('');
        }
        DAVResource.setParent(_path.join('/'));
      }

      return callback(DAVResource);
    };

    xhr.open('PROPFIND', DAVConnection.params.url + resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.setRequestHeader('Depth', '0');
    xhr.withCredentials = 'true';
    xhr.responseType = "document";

    try {
      xhr.send(jsDAVlib.xmlParser.getQueryXML());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  // Callback with the recovered DAVResource
  function getDAVResource(DAVConnection, resURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    function setParentFolder(DAVResource) {
      if (resURL === '' || resURL === DAVConnection.getInfo().rootFolder) {
        DAVResource.setParent(null);
      } else {
        var _path = resURL.split('/');
        if (_path.pop() === '') {
          _path.pop();
          _path.push('');
        }
        DAVResource.setParent(_path.join('/'));
      }
    }

    var xhr = getXHR();
    xhr.onload = function getDAVResourceResponse() {
      // We SHALL receive a MULTISTATUS response (207) // See RFC 4918
      if ( (xhr.status != 207 || !xhr.responseXML) && xhr.status != 404 ) {
        return callback(null, 'No valid DAV XML Response');
      }

      if (xhr.status === 404) {
        // Some DAV servers doesn't support PROPFIND into file resources like
        // DAVMail, so we can fake a new DAVResource and try to get the file
        jsDAVlib.debug("Alternative recovering (DAVMail?)");
        var DAVResource = new jsDAVlib.DAVResource();
        setParentFolder(DAVResource);
        getFileContents(DAVConnection,
          DAVConnection.params.url + resURL, function(data, error) {
            if (data) {
              DAVResource.addFileContents(data);
              return callback(DAVResource);
            }
            callback(null, error);
          });
      } else {
        var DAVResource = new jsDAVlib.DAVResource(xhr.responseXML);
        if (DAVResource.isException()) {
          return callback(null, DAVResource.getExceptionInfo());
        }

        setParentFolder(DAVResource);

        if (DAVResource.isFile()) {
          return getFileContents(DAVConnection,
            DAVConnection.params.url + resURL, function(data, error) {
              if (data) {
                DAVResource.addFileContents(data);
                return callback(DAVResource);
              }
              callback(null, error);
            });
        }
        if (DAVResource.isCollection()) {
          return callback(DAVResource);
        }
        callback(null, 'Not recognized resource type');
      }
    };

    xhr.open('PROPFIND', DAVConnection.params.url + resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.setRequestHeader('Depth', '1');
    xhr.withCredentials = 'true';
    xhr.responseType = "document";

    try {
      xhr.send(jsDAVlib.xmlParser.getQueryXML());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function getFileContents(DAVConnection, fileURL, callback) {
    var xhr_file = getXHR();
    xhr_file.onload = function getDAVResourceContents() {
      if (xhr_file.status < 300) callback(xhr_file.response);
      else callback(null, xhr_file.statusText);
    };
    xhr_file.open('GET', fileURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr_file.withCredentials = 'true';
    xhr_file.responseType = "text";    // TODO: Change based on mime type !
    try {
      xhr_file.send();
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  function writeDAVResource(DAVConnection, DAVResource, callback) {
    var resURL = DAVConnection.params.url + DAVResource.getMetadata().href;
    if (!DAVResource.isFile())
      return callback(null, "Resource is not a file");

    var xhr_file = getXHR();
    xhr_file.onload = function writeResourceResponse() {
      if (xhr_file.status < 300) callback(xhr_file.statusText);
      else callback(null, xhr_file.statusText);
    };
    xhr_file.open('PUT', resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr_file.withCredentials = 'true';
    try {
      xhr_file.send(DAVResource.getContents());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  return {
    checkRepository: function checkRepository(DAVConnection, callback) {
      checkDAVrepository(DAVConnection, callback);
    },

    getResourceInfo: function getResourceInfo(DAVConnection, resURL, callback) {
      getDAVResourceInfo(DAVConnection, resURL, callback);
    },

    getResource: function getResource(DAVConnection, resURL, callback) {
      getDAVResource(DAVConnection, resURL, callback);
    },

    writeResource: function writeResource(DAVConnection, DAVResource, cb) {
      writeDAVResource(DAVConnection, DAVResource, cb);
    }
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

// webdav params: url, user, password
function jsDAVConnection(params) {
  this.params = {
    url: 'http://test.webdav.org/dav/',
    user: '',
    password: ''
  };

  this.serverInfo = {
    DAV: undefined,
    Allow: undefined
  };

  this.rootInfo = {};

  if (params.url) {
    this.params.url = params.url;
  }
  if (params.user && params.password) {
    this.params.user = params.user;
    this.params.password = params.password;
  }

  // Recover ROOT folder resource
  var self = this;
  jsDAVlib.comms.checkRepository(this, function(props, error) {
    if (error) {
      jsDAVlib.debug('ERROR: ' + error);
      return self.onerror(error);
    }

    self.serverInfo = props;
    jsDAVlib.debug('Server ' + self.params.url + ' capacities', self.serverInfo);

    jsDAVlib.comms.getResourceInfo(self, '', function(DAVResource, error) {
      self.rootInfo = DAVResource.getMetadata();
      self.rootInfo.isDAVResource = !DAVResource.isException();
      self.rootInfo.isAddressBook = DAVResource.isAddressBook();
      self.rootInfo.isCalendar = DAVResource.isCalendar();

      // FIX Base URL
      // All resourceURL will be relative to the base path. We can guess this
      // base path based on the href returned by the first element of the root
      // resource
      var absoluteURL = self.params.url;
      var relativeURL = self.rootInfo.href;
      if (absoluteURL.substr(-1) != relativeURL.substr(-1)) {
        if (relativeURL.substr(-1) === '/')
          absoluteURL += relativeURL.substr(-1);
      }
      self.params.url = absoluteURL.substr(0, absoluteURL.indexOf(relativeURL));

      self.onready();
    });
  });
}

jsDAVConnection.prototype = {
  onready: function __override_me_onready__() {},
  onerror: function __override_me_onerror__() {},

  getInfo: function getInfo() {
    if (!this.rootInfo.isDAVResource) {
      return {
        url: this.params.url,
        error: 'Invalid DAV resource'
      };
    } else {
      return {
        url: this.params.url,
        rootInfo: this.rootInfo,
        serverInfo: this.serverInfo
      }
    }
  },

  // If resourceURL is null, then root Resource is returned
  getResource: function getContentsList(resourceURL, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    if (resourceURL === null || resourceURL === '') {
      resourceURL = this.rootInfo.href;
    }

    jsDAVlib.comms.getResource(this, resourceURL, function(DAVResource, error) {
      callback(DAVResource, error);
    });
  },

  // Write changes into the server
  writeResource: function writeDAVResource(DAVResource, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    jsDAVlib.comms.writeResource(this, DAVResource, function(status, error) {
      callback(status, error);
    });
  }
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.DAVResource = function jsDAVResource(XMLDocument) {
  if (XMLDocument) {
    this.xml = XMLDocument;
    this.data = jsDAVlib.xmlParser.parse(XMLDocument);
  } else {
    // If no XMLDocument is provided a new and clean resource is created
    // TO-DO: Allow collection & file creation and store changes in server
    this.xml = null;
    this.data = {
      valid: true,
      items: [{
        href: "",
        size: -1,
        mime: "",
        resourceType: {
          type: "file"
        }
      }]
    }
  }
  this.parent = null;
}

jsDAVlib.DAVResource.prototype = {
  addFileContents: function addFileContents(data) {
    this.contents = data;
  },
  isFile: function isFile() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.type === 'file';
  },
  isCollection: function isCollection() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.type === 'dir';
  },
  isAddressBook: function isAddressBook() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.addressbook === true;
  },
  isCalendar: function isCalendar() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.calendar === true;
  },
  isException: function isException() {
    if (!this.data.valid)
      return 'Received data is not valid';
    return false;
  },
  getExceptionInfo: function getExceptionInfo() {
    // TO-DO
  },

  getMetadata: function getMetadata() {
    return {
      href: this.data.items[0].href,
      mime: this.data.items[0].mime,
      size: this.data.items[0].size,
      type: this.data.items[0].resourceType
    }
  },

  getContents: function getContents() {
    if (this.isFile && this.contents) {
      return this.contents;
    } else if (this.isCollection) {
      var list = [];
      for (var i=1; i<this.data.items.length; i++) {
        list.push({
          href: this.data.items[i].href,
          mime: this.data.items[i].mime,
          size: this.data.items[i].size,
          lastModified: this.data.items[i].lastModified,
          type: this.data.items[i].resourceType.type
        });
      }
      return list;
    } else {
      return null;
    }
  },

  setParent: function setParent(parent) {
    this.parent = parent;
  },
  parent: function getParent() {
    return this.parent;
  },

  // Collection resource responds with an array of all his elements
  // File resource responds with the file contents
  get: function get() {
    return {
      meta: this.getMetadata(),
      data: this.getContents()
    };
  }
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.xmlParser = (function jsDAVXMLParser() {
  var XMLNS_DAV = 'DAV:',
      XMLNS_CardDAV = 'urn:ietf:params:xml:ns:carddav',
      XMLNS_CalDAV = 'urn:ietf:params:xml:ns:caldav';

  function parseDocument(XMLDocument) {
    var doc = {
      valid: false,
      items: []
    };

    function _getDAV_EBTN(node, tag) {
      try {
        return node.getElementsByTagNameNS(XMLNS_DAV, tag);
      } catch (e) {
        jsDAVlib.debug('Error looking for tag: ' + tag);
        return null;
      }
    }
    function _getDAV_EBTN_FirstContent(node, tag) {
      var item = _getDAV_EBTN(node, tag);
      if (item && item.length > 0) {
        return item[0].textContent;
      }
      return null;
    }
    function isCollection(node) {
      return node.getElementsByTagNameNS(XMLNS_DAV, 'collection').length > 0;
    }
    function getResourceType(node) {
      var resourceType = _getDAV_EBTN(node, 'resourcetype');
      if (resourceType) {
        var resType = {};
        if (node.getElementsByTagNameNS(XMLNS_DAV, 'collection').length > 0) {
          resType.type = 'dir';
        } else {
          resType.type = 'file';
        }
        if (node.getElementsByTagNameNS(
          XMLNS_CardDAV, 'addressbook').length > 0) resType.addressbook = true;
        if (node.getElementsByTagNameNS(
          XMLNS_CalDAV, 'calendar').length > 0) resType.calendar = true;
        return resType;
      }
      return null;
    }

    function _getItemData(node) {
      var props = _getDAV_EBTN(node, 'prop')[0];
      if (!props) {
        doc.valid = false;
        return null;
      }
      var itemData = {
        href: _getDAV_EBTN_FirstContent(node, 'href'),
        lastModified: _getDAV_EBTN_FirstContent(props, 'getlastmodified'),
        size: _getDAV_EBTN_FirstContent(props, 'getcontentlength'),
        mime: _getDAV_EBTN_FirstContent(props, 'getcontenttype')
      };

      itemData.resourceType = getResourceType(props);

      return itemData;
    }

    var allItems = _getDAV_EBTN(XMLDocument, 'response');
    if (!allItems) {
      doc.valid = false;
      return doc;
    }

    // Get all collection elements
    doc.items.allItems = [];
    for (var i=0; i<allItems.length; i++) {
      doc.items.push(_getItemData(allItems[i]));
    }

    if (doc.items.length === 0) {
      doc.valid = false;
    } else {
      doc.valid = true;
    }
    return doc;
  }

  return {
    parse: function parse(XMLDocument) {
      return parseDocument(XMLDocument);
    },
    getQueryXML: function getQueryXML() {
      return '<?xml version="1.0"?>\n' +
        '<D:propfind xmlns:D="' + XMLNS_DAV + '"><D:prop>' +
        '<D:getlastmodified/>' +
        '<D:getcontentlength/>' +
        '<D:getcontenttype/>' +
        '<D:resourcetype/>' +
        '</D:prop></D:propfind>';
    }
  }
})();

 return  jsDAVlib;
});