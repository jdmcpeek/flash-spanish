console.log("background.js");

// initialize - performed on every refresh
get_access_token_from_storage();


chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
  console.log("in background.js listener", request);

  if (request.action == "refresh_access_token") {
    console.log("refreshing the access token");
    // is this a problem if it's asynchronous? 
    get_access_token_from_storage();
  }

  if (UNAUTHORIZED) {
    if (request.action != "authorize") {
      sendResponse("unauthorized request to Quizlet.");
    } 
    return true;
  }
  var args = request.args;

  if (request.action == 'initQuizletSequence') {
    // re-order terms...
    filter_and_order_lang_terms(args); 

    getSetID(args.set_name, USERNAME, ACCESS_TOKEN)
      .then(function(set_id) {
        // if the set exists:
        addWordToSet(args.term, args.definition, ACCESS_TOKEN, set_id)
          .then(function(data) { 
            console.log(data);
            sendResponse(true);
          })
          .catch(function(reason){
            console.log(reason);
            sendResponse(false);
          });
      }).catch(function(data) {
        // initializing terms
        var init_terms = ["Hello", args.term];
        var init_definitions = [USERNAME + "!", args.definition]; 

        // if the set DOESN'T exist:
        initSet(args, ACCESS_TOKEN, init_terms, init_definitions)
          .then(function(data) {
            console.log(data);
            sendResponse(true); 
          })
          .catch(function(reason){
            console.log(reason);
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


// will need to order the term/definition by the preexisting set preferences.
// that will require a lookup. will also be able to store that somewhere. but sometimes will need updates.

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
      beforeSend: function(xhr){ console.log(xhr); xhr.setRequestHeader('Authorization', 'Bearer ' + access_token ); }
    }).done(function(data) {
      console.log(data);
      resolve(data);
    }).fail(function(error) {
      console.log(error);
      reject(error);
    });

  }); // end Promise
}


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


function getSetID(set_name, user_id, access_token) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      url: "https://api.quizlet.com/2.0/users/" + user_id,
      type: "GET",
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token); }
    }).done(function(data) {
      console.log("response", data);
      // search through all user's sets... linear search lol
      for (var i = 0; i < data.sets.length; i++) {
        if (data.sets[i].title == set_name && data.sets[i].created_by == user_id ) {
          console.log("set " + set_name + " exists");
          resolve(data.sets[i].id);
          return;
        }
      }
      console.log("motherfucking set doesn't exist");
      reject("set " + set_name + " doesn't exist");

    }).fail(function(error) {
      console.log("error!", error);
    });
  });
}


/*****************************************************
 * HELPERS
 *****************************************************/

function filter_and_order_lang_terms(args) {
// USE THIS FUNCTION TO RE-SET ALL THE TERMS THAT ARE IN THE WRONG ORDER!
// GOES BEFORE WE CALL "GETSETID"
  var reverse_order = function(args) {
    var tmp = args.term_lang;
    args.term_lang = args.target_lang;
    args.target_lang = tmp;
    tmp = args.term;
    args.term = args.definition;
    args.definition = tmp;
  }
  // DO I NEED TO SWAP THE TERM_LANG_TITLE AND TARGET_LANG_TITLE? 

  if (args.term_lang == USER_LANG || args.target_lang == USER_LANG) {
    console.log("args.term_lang == USER_LANG || args.target_lang == USER_LANG");
    console.log(args.term_lang, USER_LANG, args.target_lang);
    if (args.term_lang != USER_LANG) {
      console.log("reversed!");
      reverse_order(args);
    }
    args.set_name = 'Flash-' + get_lang_title(args.target_lang); 
    console.log(args.set_name);
  } else {
    // enforce an order...
    if (args.target_lang < args.term_lang) {
      // change term/target here?
      reverse_order(args);
      args.set_name = 'Flash-' + get_lang_title(args.target_lang) + '-' + get_lang_title(args.term_lang);
    } else {
      args.set_name = 'Flash-' + get_lang_title(args.term_lang) + '-' + get_lang_title(args.target_lang);
    } // end if
  } // end if 
}


// ACCESS TOKEN NEEDED IN THIS FILE - which is why we refresh
// store quizlet data here as well
function get_access_token_from_storage() {
  console.log("getting access token from storage...");
  chrome.storage.sync.get("quizlet_access_token", function(res) {
    UNAUTHORIZED = false; 
    quizlet_token = res.quizlet_access_token;

    if (typeof quizlet_token != 'undefined') {
      ACCESS_TOKEN = quizlet_token.access_token;
      USERNAME     = quizlet_token.user_id;
      chrome.browserAction.setPopup({popup: "authorized.html"});
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

  });
  
  // refresh browser UI to uncover the button
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log("getting tabs...");
    chrome.tabs.sendMessage(tabs[0].id, {action: "refresh_access_token"}, function(response) {
      console.log("sent response");
      console.log(response);
    });
  }); 
}

/*****************************************************
 * END HELPERS
 *****************************************************/
