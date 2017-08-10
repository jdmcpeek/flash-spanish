// TODO
// 1. if access token doesn't exist, prompt with authorization popup after pressing Quizlet button
// 2. send a message that will enable use of the api

// actual DOM insertions
var quizlet_button = "<div id='quizlet-api' style='display:none;'> \
                        <input type='button' value='Add to Quizlet' \
                        class='jfk-button jfk-button-action' /></div>";

$(quizlet_button).insertAfter($('#gt-appname'));


chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
  console.log(sender.tab ?
              "from a content script:" + sender.tab.url :
              "from the extension");
  console.log(request);
  if (request.action == "refresh_access_token") {
    get_access_token_from_storage()
      .then((response) => {
        sendResponse("refreshed this shit");
      });
  }
  return true;
});

function get_access_token_from_storage() {
  return new Promise(function(resolve, reject) {
    console.log("getting access token from storage...");
    chrome.storage.sync.get("quizlet_access_token", function(res) {
      quizlet_token = res.quizlet_access_token;
      console.log(quizlet_token);
      if (typeof quizlet_token != 'undefined') {
        $('#quizlet-api').show();
      } else {
        console.log("none exists.");
        $('#quizlet-api').hide();
      }
      resolve(true);
    });

    chrome.storage.sync.get("user_language", function(res) {
      if (res.user_language) {
        USER_LANG = res.user_language;
      } else {
        USER_LANG = "en";
      }
      console.log("user lang", USER_LANG);
    });
  }); // end promise
}

// initialize 
get_access_token_from_storage();

// two places to collect terms/definitions to add to Quizlet: 1. here, and 2. press the blue button
// 
// check if Google Translate extension is in use
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {

        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            // element added to DOM
            var hasClass = [].some.call(mutation.addedNodes, function(el) {
                return el.classList.contains('gtx-bubble')
            });

            if (hasClass) {
              console.log('element ".gtx-bubble" added');
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


$("#quizlet-api").click(function(event) {

  var url = $(location).attr('href');
  url = url.replace(/https:\/\/translate.google.com\/?\??#?/, "");
  url = url.split("/");
  console.log(url);

  // build the arguments to send to background.js thru chrome.runtime
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
    console.log(response);
  });
  

});

