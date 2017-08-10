console.log("auth.js");

// ACCESS TOKEN NOT NEEDED IN THIS FILE


function get_redirect_url () {
  return chrome.identity.getRedirectURL();
}

function make_xmlhttprequest (method, url, flag) {
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open(method, url, flag);
  xmlhttp.setRequestHeader( "Content-type","application/x-www-form-urlencoded" );
  return xmlhttp
}

// need to store state somewhere....

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function get_quizlet_client_id() {
  return 'rFVYNKqNTk';
}

function get_quizlet_client_secret() {
  return 'W2ZpCZQ6FUnWV2CNdeKS5C';
}




// https://quizlet.com/authorize?client_id=rFVYNKqNTk&response_type=code&scope=read%20write_set&state=some_random_state&redirect_uri=https%3A%2F%2Fjllbbbnhefifnkkmbokcpijfglcjnebc.chromiumapp.org%2F
function launch_chrome_webAuthFlow (client_id, state) {
  return new Promise(function(resolve, reject) {
    var redirect_url = encodeURIComponent(get_redirect_url());
    // compose the authorization url
    var authorizeUrl = "https://quizlet.com/authorize?client_id=" + client_id + "&response_type=code&scope=read%20write_set";
    authorizeUrl += ("&state=" + state + "&redirect_uri="+redirect_url);

    chrome.identity.launchWebAuthFlow(
        {'url': authorizeUrl, 'interactive': true},
        function(response) { 
            //Get access token
            var code = getParameterByName('code', response);
            var grant_type = 'authorization_code';
            // perform a request for the access token....
            xmlhttp = make_xmlhttprequest('POST', 'https://api.quizlet.com/oauth/token', true); 
            xmlhttp.setRequestHeader("Authorization", "Basic " + btoa(get_quizlet_client_id() + ":" + get_quizlet_client_secret()));
            console.log(xmlhttp); 
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    access_token_string = xmlhttp.responseText.split('&')[0]
                    console.log(access_token_string);
                    __access_token_string = access_token_string;

                    // Save it using the Chrome extension storage API.
                    chrome.storage.sync.set({'quizlet_access_token': JSON.parse(access_token_string)}, function(data) {
                      // Notify that we saved.
                      resolve('settings saved' + data);
                    });
                }
            }
            xmlhttp.send( "code="+ code +"&redirect_uri="+ get_redirect_url() + "&grant_type=" + grant_type );
        });
  });

}

// AUTHORIZATION ENTRYPOINT - received from helpers.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request + " in first addListender auth.js");
  if (request.action == "authorize") {
    launch_chrome_webAuthFlow(get_quizlet_client_id(), "some_random_state")
      .then(function(data) {
        console.log(data + " auth.js listener");
        console.log("auth complete.");
        chrome.browserAction.setPopup({popup: "authorized.html"});
        // sendResponse({action: "authorization_complete"}); 
        location.reload();
      });
  }

  return true; 
});





