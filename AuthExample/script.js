chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
  console.log(token);

  var httpStr = 'https://spreadsheets.google.com/feeds/spreadsheets/private/full?access_token=' + token;
  $.get(httpStr, function(data) {
  	console.log(data);
  });
});