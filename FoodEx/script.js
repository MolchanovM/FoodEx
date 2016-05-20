function processCells(cells) {
    serviceLinkHandlers = [];
    for (var i = 0; i < cells.length; ++i) {
        var serviceRegex = /http(?:s?):\/\/([^\/]+)\//;
        var searchResults = serviceRegex.exec(cells[i]);
        if (searchResults) {
            serviceName = searchResults[1];
            if (serviceName in services) {
                if (!(serviceName in serviceLinkHandlers)) {
                    serviceLinkHandlers[serviceName] = new services[serviceName].linkHandler();
                }
                // TODO: make intervals between requests. Preferably to make intervals only in different services.
                serviceLinkHandlers[serviceName].process(cells[i]);
            }
        }
    }
}

var getWorksheetInfo = function(url) {
    var urlRegex = /.*docs\.google\.com\/(?:.*)spreadsheets\/d\/(.*)\/.*gid=(\d*).*/g;
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

var getPageIdAPI = function(pageLink) {
    var regex = /.*\/private\/full\/(.*)/g;
    var searchResults = regex.exec(pageLink);

    var pageId = "";
    if(searchResults) {
        pageId = searchResults[1];
    }

    return pageId;
}

var cellsDataHandler = function(cellsXML) {
    var cells = $(cellsXML).find('entry').find('content[type="text"]');
    var cellsTexts = [];
    for(var i = 0; i < cells.length; ++i) {
        cellsTexts.push(cells[i].innerText);
    }

    processCells(cellsTexts);
}

var workWithPage = function(spreadsheetId, pageId, tokenAPI) {
    var cellsDataApiCall = 'https://spreadsheets.google.com/feeds/cells/' +
                           spreadsheetId + '/' +
                           pageId + '/private/full' +
                           '?access_token=' + tokenAPI;

    $.ajax({
        url: cellsDataApiCall,
        type: 'GET',
        dataType: 'jsonp',
        cache: false,
        success: cellsDataHandler
    });
}

var spreadsheetDataHandler = function(worksheetInfo, tokenAPI) {
    // return curried function that knows worksheetInfo
    return function(spreadsheetXML) {
        $(spreadsheetXML).find('entry').each(function() {
            var hrefWithPageNumberId = $(this).find('link[type="text/csv"]').attr('href');
            if(getWorksheetInfo(hrefWithPageNumberId).pageId === worksheetInfo.pageId) {
                var entryLink = $(this).find('id')[0].innerText;
                var pageIdAPI = getPageIdAPI(entryLink);
                workWithPage(worksheetInfo.spreadsheetId, pageIdAPI, tokenAPI);
            }
        });
    }
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
            success:  spreadsheetDataHandler(worksheetInfo, token)
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