
var jsDAVTestAccounts = (function jsDAVTestAccounts() {
  var accounts = {};
  var storageItemName = 'jsdav_accounts_data';

  function store() {
    localStorage.setItem(storageItemName, JSON.stringify(accounts));
  }
  function recover() {
    try {
      accounts = JSON.parse(localStorage.getItem(storageItemName));
      if (!accounts)
        accounts = {};
    } catch(e) {
      accounts = {};
    }
  }
  recover();

  return {
    getAll: function getAccounts() {
      return Object.keys(accounts);
    },
    get: function getAccount(accountName) {
      return accounts[accountName];
    },
    set: function setAccount(accountData) {
      accounts[accountData.name] = accountData;
      store();
    },
    del: function delAccount(accountName) {
      accounts[accountName] = undefined;
      store();
    },
    delall: function delAllAccounts() {
      localStorage.setItem(storageItemName, null);
    }
  }
})();

var jsDAVTestMain = (function() {
  var configured_accounts = document.getElementById('configured_accounts');
  var pageTitle = document.getElementById('page_title');
  var pages = document.getElementsByClassName('page');

 function hide_pages() {
    for (var i=0; i<pages.length; i++) {
      pages[i].classList.remove('visible');
    }
  }

  function show_page(pageId) {
    hide_pages();
    pageTitle.textContent =
      pages[pageId].getElementsByTagName('title')[0].textContent;
    pages[pageId].classList.add('visible');
  }

  // Create new accounts
  function addAccount(accountName) {
    var a = document.createElement('a');
    a.textContent = accountName;
    a.href = '#content';
    a.onclick = function openAccount() {
      var accountData = jsDAVTestAccounts.get(accountName);
      jsDAVTestMain.openAccount(accountData);
    }

    var li = document.createElement('li');
    li.appendChild(a);
    configured_accounts.appendChild(li);
  }
  function save_config() {
    jsDAVTestMain.showPage('home_page');

    var config_data = {
      name: document.getElementById('config_accountname').value,
      url: document.getElementById('url').value,
      user: document.getElementById('user').value,
      password: document.getElementById('passwd').value
    };

    jsDAVTestAccounts.set(config_data);
    addAccount(config_data.name);
    jsDAVTestMain.openAccount(config_data);
  }
  document.getElementById('config_save').onclick = save_config;

  // Menu actions
  document.getElementById('add_new_account_menu').onclick = function() {
    show_page('config_page');
  };

  // Load configured accounts
  jsDAVTestAccounts.getAll().forEach(function(accountName) {
    addAccount(accountName);
  });

  // Open HOME
  hide_pages();
  show_page('home_page');

  // Open Account data
  var openedDAVConnection = null;

  return {
    showPage: function showPage(pageid) {
      show_page(pageid);
    },

    showDAVResource: function showDAVResource(davResource, error) {
      if (!davResource) {
        console.log('ERROR: ' + error);
        return;
      }

      function add_item(desc, link) {
        var li = document.createElement('li');
        var p = document.createElement('p');
        var a = document.createElement('a');
        p.textContent = desc;
        a.onclick = function() {
          show_page('loading_page');
          openedDAVConnection.getResource(link, function(res, error) {
            showDAVResource(res, error);
          });
        }
        a.appendChild(p);
        li.appendChild(a);
        dir_ul.appendChild(li);
      }
      var dir_ul = document.getElementById('directory_list');
      document.getElementById('json_resource_dump').textContent =
        JSON.stringify(davResource, null, '  ');
      dir_ul.innerHTML = "";

      document.getElementById('path').textContent =
        davResource.data.items[0].href;

      add_item('.', davResource.data.items[0].href);

      for (var item=1;
           item < davResource.data.items.length;
           item++) {

        var element = davResource.data.items[item];
        var path = element.href.split('/');
        var description =
          '[' + (element.resourceType && element.resourceType.type) + '] ' +
          (path[path.length-1] || path[path.length-2]);
        if (element.size) {
          description += ' - ' + element.size + ' bytes';
        }

        add_item(description, element.href);
      }

      show_page('showdavresource_page');
    },

    openAccount: function openAccount(accountData) {
      show_page('loading_page');
      openedDAVConnection = jsDAVlib.getConnection(accountData);
      openedDAVConnection.onready = function() {
        jsDAVTestMain.showDAVResource(openedDAVConnection.rootResource);
        console.log('rootResource: ' +
          JSON.stringify(openedDAVConnection.rootResource));
      }
    },

    debugGetDAVConnection: function() {
      return openedDAVConnection;
    }
  }
})();