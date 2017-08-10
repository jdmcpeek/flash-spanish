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

                args['target_lang_title'] = get_lang_title(args['target_lang']);
                args['set_name'] = 'Flash-' + args['target_lang_title'];
                
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

    args['target_lang_title'] = get_lang_title(args['target_lang']);
  }

  args['set_name'] = 'Flash-' + args['target_lang_title'];

  chrome.runtime.sendMessage({
    action: "initQuizletSequence",
    args: args
  }, function(response) {
    console.log(response);
  });
  

});

function get_lang_title(code) {
  switch(code) {
    case "af":
      return "Afrikaans";
      break;
    case "sq":
      return "Albanian";
      break;
    case "am":
      return "Amharic";
      break;
    case "ar":
      return "Arabic";
      break;
    case "hy":
      return "Armenian";
      break;
    case "az":
      return "Azeerbaijani";
      break;
    case "eu":
      return "Basque";
      break;
    case "be":
      return "Belarusian";
      break;
    case "bn":
      return "Bengali";
      break;
    case "bs":
      return "Bosnian";
      break;
    case "bg":
      return "Bulgarian";
      break;
    case "ca":
      return "Catalan";
      break;
    case "ceb":
      return "Cebuano";
      break;
    case "zh-CN":
      return "Chinese (Simplified)";
      break;
    case "zh-TW":
      return "Chinese (Traditional)";
      break;
    case "co":
      return "Corsican";
      break;
    case "hr":
      return "Croatian";
      break;
    case "cs":
      return "Czech";
      break;
    case "da":
      return "Danish";
      break;
    case "nl":
      return "Dutch";
      break;
    case "en":
      return "English";
      break;
    case "eo":
      return "Esperanto";
      break;
    case "et":
      return "Estonian";
      break;
    case "fi":
      return "Finnish";
      break;
    case "fr":
      return "French";
      break;
    case "fy":
      return "Frisian";
      break;
    case "gl":
      return "Galician";
      break;
    case "ka":
      return "Georgian";
      break;
    case "de":
      return "German";
      break;
    case "el":
      return "Greek";
      break;
    case "gu":
      return "Gujarati";
      break;
    case "ht": 
      return "Haitian Creole";
      break;
    case "ha":
      return "Hausa";
      break;
    case "haw": 
     return "Hawaiian" ;
     break;
    case "iw":
      return "Hebrew";
      break;
    case "hi":
      return "Hindi";
      break;
    case "hmn":
      return "Hmong";
      break;
    case "hu":
      return "Hungarian";
      break;
    case "is":
      return "Icelandic";
      break;
    case "ig":
      return "Igbo";
      break;
    case "id":
      return "Indonesian";
      break;
    case "ga":
      return "Irish";
      break;
    case "it":
      return "Italian";
      break;
    case "ja":
      return "Japanese";
      break;
    case "jw":
      return "Javanese";
      break;
    case "kn":
      return "Kannada";
      break;
    case "kk":
      return "Kazakh";
      break;
    case "km":
      return "Khmer";
      break;
    case "ko":
      return "Korean";
      break;
    case "ku":
      return "Kurdish";
      break;
    case "ky":
      return "Kyrgyz";
      break;
    case "lo":
      return "Lao";
      break;
    case "la":
      return "Latin";
      break;
    case "lv":
      return "Latvian";
      break;
    case "lt":
      return "Lithuanian";
      break;
    case "lb":
      return "Luxembourgish";
      break;
    case "mk":
      return "Macedonian";
      break;
    case "mg":
      return "Malagasy";
      break;
    case "ms":
      return "Malay";
      break;
    case "ml":
      return "Malayalam";
      break;
    case "mi":
      return "Maori";
      break;
    case "mr":
      return "Marathi";
      break;
    case "mn":
      return "Mongolian";
      break;
    case "my":
      return "Myanmar (Burmese)";
      break;
    case "ne":
      return "Nepali";
      break;
    case "no":
      return "Norwegian";
      break;
    case "ny":
      return "Nyanja (Chichewa)";
      break;
    case "ps":
      return "Pashto";
      break;
    case "fa":
      return "Persian";
      break;
    case "pl":
      return "Polish";
      break;
    case "pt":
      return "Portuguese";
      break;
    case "ma":
      return "Punjabi";
      break;
    case "ro":
      return "Romanian";
      break;
    case "ru":
      return "Russian";
      break;
    case "sm":
      return "Samoan";
      break;
    case "gd": 
      return "Scots Gaelic";
      break;
    case "sr":
      return "Serbian";
      break;
    case "st":
      return "Sesotho";
      break;
    case "sn":
      return "Shona";
      break;
    case "sd":
      return "Sindhi";
      break;
    case "si":
      return "Sinhala (Sinhalese)";
      break;
    case "sk":
      return "Slovak";
      break;
    case "sl":
      return "Slovenian";
      break;
    case "so":
      return "Somali";
      break;
    case "es":
      return "Spanish";
      break;
    case "su":
      return "Sundanese";
      break;
    case "sw":
      return "Swahili";
      break;
    case "sv":
      return "Swedish";
      break;
    case "tl":
      return "Tagalog (Filipino)";
      break;
    case "tg":
      return "Tajik";
      break;
    case "ta":
      return "Tamil";
      break;
    case "te":
      return "Telugu";
      break;
    case "th":
      return "Thai";
      break;
    case "tr":
      return "Turkish";
      break;
    case "uk":
      return "Ukrainian";
      break;
    case "ur":
      return "Urdu";
      break;
    case "uz":
      return "Uzbek";
      break;
    case "vi":
      return "Vietnamese";
      break;
    case "cy":
      return "Welsh";
      break;
    case "xh":
      return "Xhosa";
      break;
    case "yi":
      return "Yiddish";
      break;
    case "yo":
      return "Yoruba";
      break;
    case "zu":
      return "Zulu";
      break;
    default:
      return "Spanish";
  }
}


