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
  console.log("assing myself nightly right now");
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
  }); // end promise
}

// initialize 
get_access_token_from_storage();


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
                // element has class `MyClass`
                var args = {};

                var shadow = document.querySelector('.gtx-bubble').querySelector('#gtx-host').shadowRoot;

                args['term'] = shadow.querySelectorAll('.gtx-body')[0].innerHTML;
                args['definition'] = shadow.querySelectorAll('.gtx-body')[1].innerHTML;
                args['term_lang'] = shadow.querySelector('.gtx-lang-selector').value;
                args['target_lang'] = shadow.querySelectorAll('.gtx-language')[1].innerHTML;

                if (args['term_lang'] != "en") {
                  args['target_lang'] = args['term_lang'];
                  args['term_lang'] = "en";
                  var tmp = args['term'];
                  args['term'] = args['definition']
                  args['definition'] = tmp; 
                }

                var target_lang_title = get_lang_title(args['target_lang']);
                args['set_name'] = 'Flash-' + target_lang_title;
                
                chrome.runtime.sendMessage({
                  action: "initQuizletSequence",
                  args: args
                }, function(response) {
                  console.log(response);
                });

              }, 200); // end timeout

            }
        }
    });
});

var config = {
    attributes: true,
    childList: true,
    characterData: true
};

observer.observe(document.body, config);

// end DOM insertions


function get_lang_title(code) {
  switch(code) {
    case "en":
      return "English"
      break;
    case "es":
      return "Spanish"
      break;
    case "de":
      return "German"
      break;
    default:
      return "Spanish"
  }
}


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
    args['definition'] = $('#result_box>span').html();
  
    if (args['term_lang'] != "en") {
      args['target_lang'] = args['term_lang'];
      args['term_lang'] = "en";
      var tmp = args['term'];
      args['term'] = args['definition']
      args['definition'] = tmp; 
    }

    var target_lang_title = get_lang_title(args['target_lang']);
  }

  args['set_name'] = 'Flash-' + target_lang_title;

  chrome.runtime.sendMessage({
    action: "initQuizletSequence",
    args: args
  }, function(response) {
    console.log(response);
  });
  

});



