/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var jsDAVCommunications = (function jsDAVCommunications() {

  // Helpers
  function fixCallback(cb) {
    if (typeof(cb) !== 'function')
      return function __dummy_callback__() {};
    return cb;
  }
  function getXHR() {
    return new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });
  }

  // Callback with DAV server properties
  function checkDAVrepository(DAVConnection, callback) {
    callback = fixCallback(callback);
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

  // Callback with the recovered DAVResource
  function getDAVResource(DAVConnection, resURL, callback) {
    callback = fixCallback(callback);
    var xhr = getXHR();

    xhr.onload = function getDAVCollectionResponse() {
      // We SHALL receive a MULTISTATUS response (207) // See RFC 4918
      if (xhr.status != 207 || !xhr.responseXML) {
        return callback(null, 'No valid DAV XML Response');
      }
      var DAVResource = new jsDAVResource(xhr.responseXML);
      if (DAVResource.isFile()) {
        var xhr_file = getXHR();
        xhr_file.onload = function getDAVResourceContents() {
          DAVResource.addFileContents(xhr_file.response);
          return callback(DAVResource);
        };
        xhr_file.open('GET', DAVConnection.params.url + resURL, true,
          DAVConnection.params.user, DAVConnection.params.password);
        xhr_file.withCredentials = 'true';
        xhr_file.responseType = "text";    // TODO: Change based on mime type !
        try {
          xhr_file.send();
        } catch(e) {
          jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
          return callback(null, e);
        }
        return;   // Avoid send not recognized error callback ;)
      }
      if (DAVResource.isCollection()) {
        return callback(DAVResource);
      }
      if (DAVResource.isException()) {
        return callback(null, DAVResource.getExceptionInfo());
      }
      callback(null, 'Not recognized resource type');
    };

    xhr.open('PROPFIND', DAVConnection.params.url + resURL, true,
      DAVConnection.params.user, DAVConnection.params.password);
    xhr.setRequestHeader('Depth', '1');
    xhr.withCredentials = 'true';
    xhr.responseType = "document";

    try {
      xhr.send(jsDAVXMLParser.getQueryXML());
    } catch(e) {
      jsDAVlib.debug(DAVConnection.params.url + ' ERROR: ' + e);
      callback(null, e);
    }
  }

  return {
    checkRepository: function checkRepository(DAVConnection, callback) {
      checkDAVrepository(DAVConnection, callback);
    },

    getResource: function getResource(DAVConnection, resURL, callback) {
      getDAVResource(DAVConnection, resURL, callback);
    }
  };
})();
