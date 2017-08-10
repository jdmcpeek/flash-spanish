console.log("helpers.js");

// AUTHORIZATION ENTRYPOINT 
$('#quizlet-auth>input').click(function() {
  console.log("clicked");
  // hide authorize button and replace with "loading..."
  $('#quizlet-auth').hide();
  $('.loading').show();
  chrome.runtime.sendMessage({action: "authorize"}, function(response) {
    console.log("got response from authorize, helpers.js", response);
  });
});


function get_access_token_from_storage() {
  console.log("getting access token from storage...");
  chrome.storage.sync.get("quizlet_access_token", function(res) {
    UNAUTHORIZED = false; 
    quizlet_token = res.quizlet_access_token;

    if (typeof quizlet_token != 'undefined') {
      ACCESS_TOKEN = quizlet_token.access_token;
      USERNAME     = quizlet_token.user_id;
      console.log(quizlet_token, ACCESS_TOKEN, USERNAME);  
      chrome.browserAction.setPopup({popup: "authorized.html"});
      var html = $('p#authorized').html() + " as " + USERNAME;
      $('p#authorized').html(html);

    } else {
      UNAUTHORIZED = true;
      console.log("none exists.");
      chrome.browserAction.setPopup({popup: "popup.html"});
    }
  });

  chrome.storage.sync.get("user_language", function(res) {
    if (res.user_language) {
      USER_LANG = res.user_language;
    } else {
      USER_LANG = "en";
    }
    console.log("user lang", USER_LANG);
    $('form#update-language select').val(USER_LANG);      
  });
}

get_access_token_from_storage();

// LOGOUT
$('#reset-chrome-storage').click(function() {
  console.log('resetting storage...');
  chrome.storage.sync.clear(function(data) {
    console.log('storage cleared.');
    chrome.browserAction.setPopup({popup: "popup.html"});
    // tells background.js to refresh the access token for logout
    chrome.runtime.sendMessage({action: "refresh_access_token"});

    $('#authorized,#quizlet-auth,#update-language').hide();
    $('.loading').show();

    setTimeout(function(){
      location.href = "popup.html";
    }, 1000);
    
    // location.reload();
  })
});  

$('form#update-language').submit(function() {
  chrome.runtime.sendMessage({
    action: "update_language_preferences",
    language: $('#preferred-language').val()
  }, function(response) {
    console.log(response);
    setTimeout(function() {
      $('label[for=preferred-language]').html("updated! ;)");
    }, 300);
  });
  return false;
}); 


// refresh browser UI to uncover the button
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  console.log("getting tabs from helpers.js...");
  var currentTab = tabs[0];
  tabIndex = currentTab.index;
}); 


// popup tabs/links
$('.help a:not(#back-button)').click(function() {
  chrome.tabs.create({url: $(this).attr('href'), index: tabIndex + 1});
  return false;
})


