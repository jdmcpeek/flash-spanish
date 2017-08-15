/**
 * helpers.js
 *
 * Scripts for popup.html and authorized.html.
 */

// authorization entrypoint
// begins authorization flow in auth.js
$('#quizlet-auth>input').click(function() {
  // hide authorize button and replace with "loading..."
  $('#quizlet-auth').hide();
  $('.loading').show();
  chrome.runtime.sendMessage({action: "authorize"});
});

// Refreshes the access token and other user data in chrome.storage
function get_access_token_from_storage() {
  chrome.storage.sync.get("quizlet_access_token", function(res) {
    UNAUTHORIZED = false; 
    quizlet_token = res.quizlet_access_token;
    if (typeof quizlet_token != 'undefined') {
      // access token exists
      ACCESS_TOKEN = quizlet_token.access_token;
      USERNAME     = quizlet_token.user_id;
      chrome.browserAction.setPopup({popup: "authorized.html"});
      var html = $('p#authorized').html() + " as " + USERNAME;
      $('p#authorized').html(html);
      $('#back-button').attr('href', "authorized.html");
    } else {
      // access token does not exist
      UNAUTHORIZED = true;
      chrome.browserAction.setPopup({popup: "popup.html"});
      $('#back-button').attr('href', "popup.html");
    }
  });

  // get user language preference
  chrome.storage.sync.get("user_language", function(res) {
    if (res.user_language) {
      USER_LANG = res.user_language;
    } else {
      USER_LANG = "en";
    }
    $('form#update-language select').val(USER_LANG);      
  });
}

get_access_token_from_storage();

// Logout.
$('#reset-chrome-storage').click(function() {
  chrome.storage.sync.clear(function(data) {
    chrome.browserAction.setPopup({popup: "popup.html"});
    // tells background.js to refresh its stored access token on logout
    chrome.runtime.sendMessage({action: "refresh_access_token"});
    // show loading icon briefly
    $('#authorized,#quizlet-auth,#update-language').hide();
    $('.loading').show();
    // reset popup to logged-out popup.html
    setTimeout(function(){
      location.href = "popup.html";
    }, 1000);
  })
});  

// Updates user language preferences.
$('form#update-language').submit(function() {
  chrome.runtime.sendMessage({
    action: "update_language_preferences",
    language: $('#preferred-language').val()
  }, function(response) {
    setTimeout(function() {
      $('label[for=preferred-language]').html("updated! ;)");
    }, 300);
  });
  return false;
}); 

// Refresh browser UI to uncover the button
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  var currentTab = tabs[0];
  tabIndex = currentTab.index;
}); 


// Popup tabs/links
$('.help a:not(#back-button)').click(function() {
  chrome.tabs.create({url: $(this).attr('href'), index: tabIndex + 1});
  return false;
});
