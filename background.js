/**
 * background.js
 *
 * Chrome extension event handlers and Quizlet API calls.
 */

// Initialize - performed on every refresh
get_access_token_from_storage();

// main event listener
chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
  if (request.action == "refresh_access_token") {
    get_access_token_from_storage();
  }

  if (UNAUTHORIZED) {
    if (request.action != "authorize") {
      sendResponse("Unauthorized request to Quizlet.");
    } 
    return true;
  }
  // get the args
  var args = request.args;
  if (request.action == 'initQuizletSequence') {
    // re-order terms
    filter_and_order_lang_terms(args); 

    getSetID(args.set_name, USERNAME, ACCESS_TOKEN)
      .then(function(set_id) {
        // if the set exists:
        addWordToSet(args.term, args.definition, ACCESS_TOKEN, set_id)
          .then(function(data) { 
            sendResponse(true);
          })
          .catch(function(reason){
            sendResponse(false);
          });
      }).catch(function(data) {
        // Initial terms/definitions in Quizlet set (minimum: 2)
        var init_terms = ["Hello", args.term];
        var init_definitions = [USERNAME + "!", args.definition]; 

        // If the set DOESN'T exist:
        initSet(args, ACCESS_TOKEN, init_terms, init_definitions)
          .then(function(data) {
            sendResponse(true); 
          })
          .catch(function(reason){
            sendResponse(false);
          });
      });
  } else if (request.action == 'update_language_preferences') {
    chrome.storage.sync.set({'user_language': request.language}, function() {
      sendResponse("language preference set");
    });
    USER_LANG = request.language;
  }
  return true;
});

// Adds a word/definition pair to the specified Quizlet set.
function addWordToSet(term, definition, access_token, set_id) {
  return new Promise(function(resolve, reject) {
    var endpoint = "https://api.quizlet.com/2.0/sets/" + set_id + "/terms";
    $.ajax({
      url: endpoint,
      type: "POST",
      data: {
        term: term,
        definition: definition
      },
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token ); }
    }).done(function(data) {
      resolve(data);
    }).fail(function(error) {
      reject(error);
    });
  }); // end Promise
}

// Creates a new Quizlet set. 
// Only called if the appropriate set does not yet exist in the user's Quizlet account, 
// given the user's language preferences and the source/target languages.
function initSet(args, access_token, terms=["hello", "hello"], definitions=["world", "world"]) { 
  return new Promise(function(resolve, reject) {
    var quizlet_set_title = args.set_name; 
    $.ajax({
      url: "https://api.quizlet.com/2.0/sets",
      type: "POST",
      data: {
        whitespace: 1,
        title: quizlet_set_title,
        terms: terms,
        definitions: definitions,
        lang_terms: args.term_lang,
        lang_definitions: args.target_lang
      },
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token ); }
    }).done(function(data){
      resolve(data);
    });
  });
}

// Retrieves a Quizlet set's id.
function getSetID(set_name, user_id, access_token) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      url: "https://api.quizlet.com/2.0/users/" + user_id,
      type: "GET",
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token); }
    }).done(function(data) {
      // search through each of the user's sets to find a match. 
      for (var i = 0; i < data.sets.length; i++) {
        if (data.sets[i].title == set_name && data.sets[i].created_by == user_id ) {
          resolve(data.sets[i].id);
          return;
        }
      }
      reject("Set " + set_name + " doesn't exist");
    }).fail(function(error) {
      console.log("error!", error);
    });
  });
}


/*****************************************************
 * HELPERS
 *****************************************************/

 // Resets language terms to enforce the correct order.
 // Order: USER_LANG, target_lang
 // Or, if USER_LANG not present in term/definition, default to alphabetical order.
function filter_and_order_lang_terms(args) {
  var reverse_order = function(args) {
    var tmp = args.term_lang;
    args.term_lang = args.target_lang;
    args.target_lang = tmp;
    tmp = args.term;
    args.term = args.definition;
    args.definition = tmp;
  }
  if (args.term_lang == USER_LANG || args.target_lang == USER_LANG) {
    if (args.term_lang != USER_LANG) {
      reverse_order(args);
    }
    args.set_name = 'Flash-' + get_lang_title(args.target_lang); 
  } else {
    // enforce an order...
    if (get_lang_title(args.target_lang) < get_lang_title(args.term_lang)) {
      reverse_order(args);
    } // end if
    args.set_name = 'Flash-' + get_lang_title(args.term_lang) + '-' + get_lang_title(args.target_lang);
  } // end if 
}


// Refreshes the access token and other user data in chrome.storage
function get_access_token_from_storage() {
  // get quizlet access token.
  chrome.storage.sync.get("quizlet_access_token", function(res) {
    UNAUTHORIZED = false; 
    quizlet_token = res.quizlet_access_token;
    if (typeof quizlet_token != 'undefined') {
      ACCESS_TOKEN = quizlet_token.access_token;
      USERNAME     = quizlet_token.user_id;
      chrome.browserAction.setPopup({popup: "authorized.html"});
    } else {
      UNAUTHORIZED = true;
      chrome.browserAction.setPopup({popup: "popup.html"});
    }
  });

  // get user language preferences.
  chrome.storage.sync.get("user_language", function(res) {
    if (res.user_language) {
      USER_LANG = res.user_language;
    } else {
      USER_LANG = "en"; 
    }
  });
  
  // refresh browser UI to uncover the button.
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "refresh_access_token"}, function(response) {
      console.log(response);
    });
  }); 
}

/*****************************************************
 * END HELPERS
 *****************************************************/
