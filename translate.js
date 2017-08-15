/**
 * translate.js
 *
 * Content script for Google Translate webpage/chrome extension.
 * Scrapes page for source/target language and initiates translation
 *  flow in background.js.
 */

// DOM insertion
var quizlet_button = "<div id='quizlet-api' style='display:none; float: left;'> \
                        <input type='button' value='Add to Quizlet' \
                        class='jfk-button jfk-button-action' /></div>";

$(quizlet_button).insertAfter($('#gt-appname'));


var loading = "<div class='loading' style='display: none; float: left; margin-top:-6px;'>" + 
                  "<p id='text'>Loading...</p>" +
                "</div>";

$(loading).insertAfter('#quizlet-api');


chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
  if (request.action == "refresh_access_token") {
    get_access_token_from_storage()
      .then((response) => {
        sendResponse("Refreshed access token.");
      });
  }
  return true;
});

// Refreshes the access token and other user data in chrome.storage
function get_access_token_from_storage() {
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get("quizlet_access_token", function(res) {
      quizlet_token = res.quizlet_access_token;
      if (typeof quizlet_token != 'undefined') {
        $('#quizlet-api').css("display", "inline-block");
      } else {
        $('#quizlet-api').hide();
      }
      resolve(true);
    });
    
    // get user language preferences.
    chrome.storage.sync.get("user_language", function(res) {
      if (res.user_language) {
        USER_LANG = res.user_language;
      } else {
        USER_LANG = "en";
      }
    });
  }); // end Promise
}

// initialize 
get_access_token_from_storage();

// Two places to collect terms/definitions to add to Quizlet: 1. here, and 2. press the blue button
// 
// Checks if Google Translate extension is in use
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {

        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            // element added to DOM
            var hasClass = [].some.call(mutation.addedNodes, function(el) {
                return el.classList.contains('gtx-bubble');
            });

            if (hasClass) {
              setTimeout(function() {
                // collect args...
                var args = {};
                var shadow = document.querySelector('.gtx-bubble').querySelector('#gtx-host').shadowRoot;
                args['term'] = shadow.querySelectorAll('.gtx-body')[0].innerHTML;
                args['definition'] = shadow.querySelectorAll('.gtx-body')[1].innerHTML;
                args['term_lang'] = shadow.querySelector('.gtx-lang-selector').value;
                args['target_lang'] = shadow.querySelectorAll('.gtx-language')[1].innerHTML;
                chrome.runtime.sendMessage({
                  action: "initQuizletSequence",
                  args: args
                }, function(response) {
                  console.log(response);
                }); // end chrome.runtime.sendMessage 
              }, 200); // end timeout

            } // end if (hasClass)
        } // end if (mutation.addedNodes)
    });
});

var config = {
    attributes: true,
    childList: true,
    characterData: true
};

observer.observe(document.body, config);
// end DOM insertions


// Two places to collect terms/definitions to add to Quizlet: 1. here, and 2. the MutationObserver
// 
// "Add to Quizlet" button click on Google Translate webpage
$("#quizlet-api").click(function(event) {
  // show loading spinner
  $('.loading').show();
  // get language information
  var url = $(location).attr('href');
  url = url.replace(/https:\/\/translate.google.com\/?\??#?/, "");
  url = url.split("/");
  // build the arguments to send to background.js through chrome.runtime
  var args = {};
  if (url.length >= 3) {
    args['term_lang'] = url[0];
    args['target_lang'] = url[1];
    args['term'] = decodeURIComponent(url[2]);

    var str_array = [];
    $('#result_box').children().each((i, v) => {
      str_array.push($(v).html()); 
    });
    args['definition'] = str_array.join(" ");
  } // end if (url.length)

  chrome.runtime.sendMessage({
    action: "initQuizletSequence",
    args: args
  }, function(response) {
    var response_txt;
    // slide button out...
    if (response == true) {
      // success!
      response_txt = "Success! Term added to set.";
    } else {
      // failure...
      response_txt = "Something went wrong. We are so, so sorry :'(";
    }
    $('.loading #text').html(response_txt);
    setTimeout(function() {
      $('.loading').toggle('slide', {direction: 'left'}, 400, function() {
        $('.loading #text').html("Loading...");
      }); 
    }, 3000);
  });
});
