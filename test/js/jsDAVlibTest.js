
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

  function resize_view() {
    var textboxarea = document.getElementById('file_contents');
    textboxarea.style.height = '305px';
    textboxarea.style.width =
      (textboxarea.parentElement.parentElement.clientWidth - 10) + 'px';
  }
  window.onresize = resize_view;

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

      var resourceMetadata = davResource.getMetadata();
      document.getElementById('path').textContent = resourceMetadata.href;
      document.getElementById('json_resource_metadata').textContent =
        JSON.stringify(resourceMetadata, null, '  ');

      add_item('.', resourceMetadata.href);
      if (davResource.parent) {
        add_item('..', davResource.parent);
      }

      if (davResource.isCollection()) {
        document.getElementById('file_data').hidden = true;
        var resourceCollectionContents = davResource.getContents();
        for (var item=1;
             item < resourceCollectionContents.length;
             item++) {

          var element = resourceCollectionContents[item];
          var path = element.href.split('/');
          var description =
            '[' + element.type + '] ' +
            (path[path.length-1] || path[path.length-2]);
          if (element.size) {
            description += ' - ' + element.size + ' bytes';
          }

          add_item(description, element.href);
        }
      } else {
        // We consider this is a file
        document.getElementById('file_contents').value =
          davResource.getContents();
        document.getElementById('file_data').hidden = false;
        document.getElementById('file_save').onclick = function saveDAVRes() {
          davResource.addFileContents(
            document.getElementById('file_contents').value);
          openedDAVConnection.writeResource(davResource);
        };
        setTimeout(resize_view);
      }

      show_page('showdavresource_page');
    },

    openAccount: function openAccount(accountData) {
      show_page('loading_page');
      openedDAVConnection = jsDAVlib.getConnection(accountData);
      openedDAVConnection.onready = function() {
        console.log('connectionInfo: ' +
          JSON.stringify(openedDAVConnection.getInfo()));
        openedDAVConnection.getResource(null, function(res, error) {
          jsDAVTestMain.showDAVResource(res, error);
        });
      }
    },

    debugGetDAVConnection: function() {
      return openedDAVConnection;
    }
  }
})();
