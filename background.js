console.log("background.js");


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
    } else {
      UNAUTHORIZED = true;
      console.log("none exists.");
      chrome.browserAction.setPopup({popup: "popup.html"});
    }
  });
}

// initialize 
get_access_token_from_storage();



// this needs to be a long-term port for message passing....
chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
  console.log("in background.js listener");

  if (request.action == "refresh_access_token") {
    console.log("refreshing the access token");
    get_access_token_from_storage();
  }

  // console.log(ACCESS_TOKEN, USERNAME);

  if (UNAUTHORIZED) {
    if (request.action != "authorize") {
      sendResponse("unauthorized request to Quizlet.");
    } 
    return true;
  }
  var args = request.args;
  console.log(JSON.stringify(request));

  if (request.action == 'initQuizletSequence') {
    getSetID(args.set_name, USERNAME, ACCESS_TOKEN)
      .then(function(set_id) {
        addWordToSet(args.term, args.definition, args.term_lang, ACCESS_TOKEN, set_id)
          .then(function(data) { 
            console.log(data);
            sendResponse("success: term " + args.term + "added to set.");
          })
          .catch(function(reason){
            console.log(reason);
          });
      }).catch(function(data) {
        // init set with the target words as well
        var terms = [args.term, "hello"];
        var definitions = [args.definition, "world"]; 
        initSet(args.target_lang, ACCESS_TOKEN, terms, definitions)
          .then(function(data) {
            console.log(data);
            sendResponse("success: set created. term " + args.term + "added."); 
          })
          .catch(function(reason){
            console.log(reason);
          });
      });
  } 

  return true;
});

function addWordToSet(term, definition, term_lang, access_token, set_id) {
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



function initSet(target_lang, access_token, terms=["hello", "hello"], definitions=["world", "world"]) { 
  return new Promise(function(resolve, reject) {
    var quizlet_set_title = 'Flash-' + target_lang.title;
    $.ajax({
      url: "https://api.quizlet.com/2.0/sets",
      type: "POST",
      data: {
        whitespace: 1,
        title: quizlet_set_title,
        terms: terms,
        definitions: definitions,
        lang_terms: "en",
        lang_definitions: target_lang.code
      },
      beforeSend: function(xhr){ console.log(xhr); xhr.setRequestHeader('Authorization', 'Bearer ' + access_token ); }
    }).done(function(data){
      alert(JSON.stringify(data));
      resolve(data);
    });
  });
}


function checkIfExists(set_name, user_id, access_token) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      url: "https://api.quizlet.com/2.0/users/" + user_id,
      type: "GET",
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token); }
    }).done(function(data) {
      console.log("response", data);

      if (data.sets.length > 0) {
        for (var i = 0; i < data.sets.length; i++) {
          if (data.sets[i].title == set_name && data.sets[i].created_by == user_id ) {
            console.log("motherfucking set exists");
            resolve(data.sets[i].id);
            return;
          } 
        }
        console.log("motherfucking set doesn't exist");
        reject("set " + set_name + "doesn't exist");
      } else {
        console.log("motherfucking set doesn't exist ugh");
        reject("set " + set_name + "doesn't exist");
      }
    })
  });
}


function getSetID(set_name, username, access_token) {
  return new Promise(function(resolve, reject) {
    var query_str = "q=" + set_name + "&creator=" + username;
    $.ajax({
      url: "https://api.quizlet.com/2.0/search/sets?" + query_str,
      type: "GET",
      beforeSend: function(xhr){ xhr.setRequestHeader('Authorization', 'Bearer ' + access_token); }
    }).done(function(data) {
      console.log("response", data);
      // if set exists, return the id
      // if not, return false
      var sets = data.sets;
      console.log("sets", sets);
      if (sets.length == 0) {
        console.log("length is 0, sorry");
        checkIfExists(set_name, username)
          .then(function(data) {
            console.log("totally existed", set_name);
            console.log("id", data);
            resolve(data);
          })
          .catch(function(reason) {
            console.log(reason);
            reject(reason);
          });
        
      } else {
        console.log(sets[0]);
        resolve(sets[0].id); 
      }

    });
  });
}