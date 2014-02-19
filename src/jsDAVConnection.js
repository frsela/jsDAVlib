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

  this.server = {
    DAV: undefined,
    Allow: undefined
  };

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

    self.server = props;
    jsDAVlib.debug('Server ' + self.params.url + ' capacities', self.server);
    jsDAVlib.comms.getResource(self, '', function(DAVResource, error) {
      self.rootResource = DAVResource;

      // FIX Base URL
      // All resourceURL will be relative to the base path. We can guess this
      // base path based on the href returned by the first element of the root
      // resource
      var absoluteURL = self.params.url;
      var relativeURL = DAVResource.data.items[0].href;
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
    if (this.rootResource.isException()) return {
      url: this.params.url,
      error: 'Invalid DAV resource'
    };
    return {
      url: this.params.url,
      rootFolder: this.rootResource.data.items[0].href,
      lastModified: this.rootResource.data.items[0].lastModified,
      isDAVResource: !this.rootResource.isException(),
      isAddressBook: this.rootResource.isAddressBook(),
      isCalendar: this.rootResource.isCalendar()
    }
  },

  // If resourceURL is null, then root Resource is returned
  getResource: function getContentsList(resourceURL, callback) {
    if (typeof(callback) !== 'function')
      callback = function __dummy_callback__() {};

    if (resourceURL === null ||
        resourceURL === this.rootResource.data.items[0].href) {
      callback(this.rootResource);
    } else {
      jsDAVlib.comms.getResource(this, resourceURL,
        function(DAVResource, error) {
          callback(DAVResource, error);
        });
    }
  }
};
