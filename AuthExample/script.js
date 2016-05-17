chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
  console.log(token);

  var httpStr = 'https://spreadsheets.google.com/feeds/worksheets/1Ir0bSQ91yYrfAeYcZVQK3EJSvZkjtOcpMkb_BwY4AXE/private/full?access_token=' + token;
  $.ajax({
  	url: httpStr,
  	type: 'GET',
  	dataType: 'jsonp',
  	cache: false,
  	success: function(response) {
  		console.log(response);
  	}
  });
});