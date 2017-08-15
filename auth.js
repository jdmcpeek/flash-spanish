/**
 * auth.js
 *
 * All chrome.api authorization logic
 */


function get_redirect_url () {
  return chrome.identity.getRedirectURL();
}

function make_xmlhttprequest (method, url, flag) {
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open(method, url, flag);
  xmlhttp.setRequestHeader( "Content-type","application/x-www-form-urlencoded" );
  return xmlhttp
}

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


function launch_chrome_webAuthFlow (client_id, state) {
  return new Promise(function(resolve, reject) {
    var redirect_url = encodeURIComponent(get_redirect_url());
    // compose the authorization url
    var authorizeUrl = "https://quizlet.com/authorize?client_id=" + client_id + "&response_type=code&scope=read%20write_set";
    authorizeUrl += ("&state=" + state + "&redirect_uri=" + redirect_url);

    chrome.identity.launchWebAuthFlow(
        {'url': authorizeUrl, 'interactive': true},
        function(response) { 
            // get Quizlet-generated code (necessary to request the access token)
            var code = getParameterByName('code', response);
            // security check: ensure that the callback is coming from Quizlet's servers.
            var returned_state = getParameterByName('state', response);
            if (returned_state != state) { 
              reject("Incorrect state; possible CSRF attack");
              return false;
            }
            var grant_type = 'authorization_code';
            // request the access token
            xmlhttp = make_xmlhttprequest('POST', 'https://api.quizlet.com/oauth/token', true); 
            xmlhttp.setRequestHeader("Authorization", "Basic " + btoa(get_quizlet_client_id() + ":" + get_quizlet_client_secret()));
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                    access_token_string = xmlhttp.responseText.split('&')[0]
                    __access_token_string = access_token_string;

                    // Save access token by using the Chrome extension storage API.
                    chrome.storage.sync.set({'quizlet_access_token': JSON.parse(access_token_string)}, function(data) {
                      // Notify that we saved.
                      resolve('Settings saved.');
                    });
                }
            }
            xmlhttp.send( "code=" + code + "&redirect_uri=" + get_redirect_url() + "&grant_type=" + grant_type );
        });
  });

}

// Authorization entrypoint.
// Received from helpers.js on pressing the "Authorize Quizlet" button.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action == "authorize") {
    launch_chrome_webAuthFlow(get_quizlet_client_id(), Math.random() + '')
      .then(function(data) {
        chrome.browserAction.setPopup({popup: "authorized.html"});
        location.reload();
      })
      .catch(function(error) {
        console.log(error);
        location.reload();
      });
  }
  return true; 
});





