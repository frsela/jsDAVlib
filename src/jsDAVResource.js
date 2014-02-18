/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

function jsDAVResource(XMLDocument) {
  this.xml = XMLDocument;
  this.data = jsDAVlib.xmlParser.parse(XMLDocument);
}

jsDAVResource.prototype = {
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
  getFileContents: function getFileContents() {
    if (this.isFile && this.contents)
      return this.contents;
    else
      return null;
  },
  getCollectionContents: function getCollectionContents() {
    if (this.isCollection) {
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
    } else
      return null;
  },

  // Collection resource responds with an array of all his elements
  // File resource responds with the file contents
  get: function get() {
    if (this.isFile() || this.contents) {
      return {
        meta: this.getMetadata(),
        data: this.getFileContents()
      };
    } else {
      return {
        meta: this.getMetadata(),
        data: this.getCollectionContents()
      };
    }
  }
};
