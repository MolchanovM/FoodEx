// chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
//   console.log(token);

//   var httpStr = 'https://spreadsheets.google.com/feeds/cells/1Ir0bSQ91yYrfAeYcZVQK3EJSvZkjtOcpMkb_BwY4AXE/omxooju/private/full?access_token=' + token;
//   $.ajax({
//   	url: httpStr,
//   	type: 'GET',
//   	dataType: 'jsonp',
//   	cache: false,
//   	success: function(response) {
//   		console.log(response);
//   	}
//   });
// });

var getWorksheetInfo = function(url) {
    var urlRegex = /.*docs\.google\.com\/spreadsheets\/d\/(.*)\/.*gid=(\d*).*/g;
    var searchResults = urlRegex.exec(url);

    var toReturn = {};
    if(searchResults) {
        toReturn = {
            spreadsheetId: searchResults[1],
            pageId: searchResults[2]
        };
    }

    return toReturn;
}

var spreadsheetDataHandler = function(spreadsheetXML) {
    console.log(spreadsheetXML);
}

var workWithWorksheet = function(worksheetInfo) {
    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        var spreadsheetInfoApiCall = 'https://spreadsheets.google.com/feeds/worksheets/' +
                                     worksheetInfo.spreadsheetId +
                                     '/private/full?access_token=' + token;

        $.ajax({
            url:      spreadsheetInfoApiCall,
            type:     'GET',
            dataType: 'jsonp',
            cache:    false,
            success:  spreadsheetDataHandler
        });
    });
}

var addCurrentWorksheet = function() {
    chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
        var currentTab = tabs[0];
        var url = currentTab.url;
        var worksheetInfo = getWorksheetInfo(url);
        workWithWorksheet(worksheetInfo);
    });
};  

$(document).ready(function() {
    $("#clickButton").click(addCurrentWorksheet);
});