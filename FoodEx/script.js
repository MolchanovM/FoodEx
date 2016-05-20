function getServiceName(link) {
    var serviceRegex = /http(?:s?):\/\/([^\/]+)\//;
    var searchResults = serviceRegex.exec(link);
    if(searchResults) {
        return searchResults[1];
    }
}

function worker(arr, linkHandler) {
    var arrayIdx = 0;
    var makeOneOrder = function() {
        if(arrayIdx < arr.length) {
            linkHandler.process(arr[arrayIdx][0], arr[arrayIdx][1]);

            console.log(arr[arrayIdx][0] + "started");

            arrayIdx++;
            setTimeout(makeOneOrder, 1000);
        }
    }
    setTimeout(makeOneOrder, 1000);
}

function processCells(cells) {
    serviceLinkHandlers = [];
    linksCounts = {};

    // count unique links
    for (var i = 0; i < cells.length; ++i) {
        var cellData = cells[i];
        linksCounts[cellData] = 1 + (linksCounts[cellData] || 0);
    }

    // get them to the array
    var linksCountsArray = [];
    for(var link in linksCounts) {
        var serviceName = getServiceName(link);
        if(serviceName in services) {
            if (!(serviceName in linksCountsArray)) {
                linksCountsArray[serviceName] = [];
                serviceLinkHandlers[serviceName] = new services[serviceName].linkHandler();
            }
            if(services[serviceName].hasCount) {
                linksCountsArray[serviceName].push([link, linksCounts[link]])
            } else {
                for (var i = 0; i < linksCounts[link]; ++i)
                    linksCountsArray[serviceName].push([link, 1]);
            }
        }
    }

    for (var serviceName in linksCountsArray) {
        worker(linksCountsArray[serviceName], serviceLinkHandlers[serviceName]);
    }
}

function getWorksheetInfo(url) {
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

function getPageIdAPI(pageLink) {
    var regex = /.*\/private\/full\/(.*)/g;
    var searchResults = regex.exec(pageLink);

    var pageId = "";
    if(searchResults) {
        pageId = searchResults[1];
    }

    return pageId;
}

function cellsDataHandler(cellsXML) {
    var cells = $(cellsXML).find('entry').find('content[type="text"]');
    var cellsTexts = [];
    for(var i = 0; i < cells.length; ++i) {
        cellsTexts.push(cells[i].innerText);
    }

    processCells(cellsTexts);
}

function workWithPage(spreadsheetId, pageId, tokenAPI) {
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

function spreadsheetDataHandler(worksheetInfo, tokenAPI) {
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

function workWithWorksheet(worksheetInfo) {
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

function addCurrentWorksheet() {
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