//***
//Returns a regex that matches where the string is in a url's (domain) name
//***
String.prototype.URL_check = (function() {
  "use strict";
  return (new RegExp("^(http|https)*(:\/\/)*(.*\\.)*(" + this + "|www." + this +")+\\.com"));
});

//Class for storing keycodes and helper functions
var Keys = function() {
  this.codes =
  {
    play: {key: 81, modifier_alt: true, modifier_ctrl: false, modifier_shift: false},
    prev: {key: 65, modifier_alt: true, modifier_ctrl: false, modifier_shift: false},
    next: {key: 83, modifier_alt: true, modifier_ctrl: false, modifier_shift: false},
    mute: {key: 77, modifier_alt: true, modifier_ctrl: false, modifier_shift: false}
  };
  this.mk_codes = {mk_play: 179, mk_prev: 177, mk_next: 176, mk_mute: 173};
  this.mk_enabled = true;
  this.sites =
  {
    bandcamp: true,
    grooveshark: true,
    pandora: true,
    rdio: true,
    spotify: true
  };
};

//***
//Load setting from chrome extension storage into the Keys object
//***
Keys.prototype.Load = (function() {
  var _keys = this;
  chrome.storage.local.get(function(obj) {
    for(var p in obj) {
      if(p == "hotkey-play-pause") _keys.codes["play"] = obj[p];
      if(p == "hotkey-play-next") _keys.codes["next"] = obj[p];
      if(p == "hotkey-play-prev") _keys.codes["prev"] = obj[p];
      if(p == "hotkey-mute") _keys.codes["mute"] = obj[p];
      if(p == "hotkey-mk-enabled") _keys.mk_enabled = obj[p];
      if(p == "hotkey-grooveshark-enabled") _keys.sites.grooveshark = obj[p];
      if(p == "hotkey-bandcamp-enabled") _keys.sites.bandcamp= obj[p];
      if(p == "hotkey-rdio-enabled") _keys.sites.rdio = obj[p];
      if(p == "hotkey-spotify-enabled") _keys.sites.spotify = obj[p];
      if(p == "hotkey-pandora-enabled") _keys.sites.pandora = obj[p];
    }
  });
});

var URL_cache = function()
{
  this.site = {
    bandcamp: null,
    grooveshark: null,
    pandora: null,
    rdio: null,
    spotify: null
  };
};

//***
//Set a site's tab id to null when it's tab is closed
//***
URL_cache.prototype.remove_by_id = function(id) {
  for(var name in this.site) {
    if(this.site[name] == id) this.site[name] = null;
  }
};

//***
//Returns a list of sites to find tabID's for
//***
URL_cache.prototype.get_sites_to_find = (function() {
  var tabs_to_find = [];
  for(var name in this.site) {
    if(this.site[name] === null) {
      tabs_to_find.push(name);
    }
  }
  return tabs_to_find;
});

var hotkey_actions = {"play_pause": true, "play_next": true, "play_prev": true, "mute": true};
var url_patterns = {grooveshark: "*://*.grooveshark.com/*", bandcamp: "*://*.bandcamp.com/*", rdio: "*://*.rdio.com/*", spotify: "*://*.spotify.com/*", pandora: "*://*.pandora.com/*"};
var cache = new URL_cache();
var hotkeys = new Keys();
hotkeys.Load();

//***
//When a tab is closed remove it from the cache
//***
chrome.tabs.onRemoved.addListener(function (tabID, removeInfo) {cache.remove_by_id(tabID);});

//***
//Searches tabs array for the first matching domain of site_name and sends the requested action to that tab
//***
function query_tabs(tabs, site_name, request_action) {
  if(tabs.length > 0) {
    console.log("BG request:" + request.action + " SEND TO: " + tabs[0].title);
    chrome.tabs.sendMessage(tabs[0].id, {action: request_action, site: site_name});
  }
}

//***
//Send an action request to the music player's tab
//**
function send(cache, action) {
  for(var name in cache.site) {
    if(hotkeys.sites[name] && cache.site[name] !== null) { //If the site we are sending to is enabled in the settings, and the tab we are sending to exists
      console.log("BG request:" + action + " SEND TO: " + cache.site[name]);
      chrome.tabs.sendMessage(cache.site[name], {"action": action, site: name});
    }
  }
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.action == "get_keys") {
    sendResponse(JSON.stringify(hotkeys));
  }
  if(request.action == "update_keys") {
    hotkeys.load();
    chrome.tabs.query({}, function(tabs) {
      for(var i = 0; i < tabs.length; i++) {
        chrome.tabs.sendMessage(tabs[i].id, {action: "update_keys", data: JSON.stringify(hotkeys)});
      }
    });
  }
  //This is a request for a hotkey action
  else if(request.action in hotkey_actions) {
    var tabs_to_find = cache.get_sites_to_find();
    var action = request.action;
    chrome.tabs.query({}, function(tabs) {
      for(var i = 0; i < tabs.length; i++) {
        for(var j = 0; j < tabs_to_find.length; j++) {
          if(tabs_to_find[j].URL_check().test(tabs[i].url)){
            cache.site[tabs_to_find[j]] = tabs[i].id;
            tabs_to_find.splice(j, 1);
          }
        }
      }
      console.log("URL CACHE: " + JSON.stringify(cache));
      send(cache, action);
    });
  }
});