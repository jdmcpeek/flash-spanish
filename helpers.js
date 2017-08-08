console.log("helpers.js");


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
}

get_access_token_from_storage();


$('#quizlet-auth>input').click(function() {
  console.log("clicked");
  // hide authorize button and replace with "loading..."
  $('#quizlet-auth').hide();
  $('.loading').show();
  chrome.runtime.sendMessage({action: "authorize"});
});


// clear storage function...
$('#reset-chrome-storage').click(function() {
  console.log('resetting storage...');
  chrome.storage.sync.clear(function(data) {
    console.log('storage cleared.');
    chrome.browserAction.setPopup({popup: "popup.html"});
    chrome.runtime.sendMessage({action: "refresh_access_token"});

    $('#authorized,#quizlet-auth').hide();
    $('.loading').show();

    setTimeout(function(){
      location.href = "popup.html";
    }, 1000);
    
    // location.reload();
  })
});  


