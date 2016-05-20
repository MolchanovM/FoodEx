var itemsDone = 0;
var itemsTotal = 0;

function updateUI() {
    $('#labelDone').text(itemsDone);
    $('#labelTotal').text(itemsTotal);

    var percents = 0;
    if(itemsTotal > 0) {
        var percents = 100.0*itemsDone / itemsTotal;
    }
    $('#progress').width(percents + '%');

    if(itemsDone === itemsTotal) {
        $('#doneLabel').css('color', 'black');
    }
}

function getServiceName(link) {
    var serviceRegex = /http(?:s?):\/\/([^\/]+)\//;
    var searchResults = serviceRegex.exec(link);
    if (searchResults) {
        return searchResults[1];
    }
}

function runWorker(items, linkHandler, cartAddress) {
    var idx = 0;
    var nextItem = function() {
        if (idx < items.length) {
            linkHandler.process(items[idx][0], items[idx][1]);
            itemsDone += items[idx][1];
            ++idx;
            updateUI();
            setTimeout(nextItem, 1000 * (Math.random() * 0.5 + 0.8));
        } else {
            chrome.tabs.create({ url: cartAddress, selected: false });
        }
    }
    setTimeout(nextItem, 1000 * (Math.random() * 0.5 + 0.8));
}

function processCells(cells) {
    serviceLinkHandlers = [];
    cellCounts = [];

    // count unique links
    for (var i = 0; i < cells.length; ++i) {
        var cellData = cells[i];
        cellCounts[cellData] = 1 + (cellCounts[cellData] || 0);
    }

    // get them to the array
    var linkCounts = [];
    for (var cell in cellCounts) {
        var serviceName = getServiceName(cell);
        if (serviceName in services) {
            itemsTotal += cellCounts[cell];
            if (!(serviceName in linkCounts)) {
                linkCounts[serviceName] = [];
                serviceLinkHandlers[serviceName] = new services[serviceName].linkHandler();
            }
            if (services[serviceName].hasCount) {
                linkCounts[serviceName].push([cell, cellCounts[cell]])
            } else {
                for (var i = 0; i < cellCounts[cell]; ++i)
                    linkCounts[serviceName].push([cell, 1]);
            }
        }
    }

    for (var serviceName in linkCounts) {
        runWorker(linkCounts[serviceName], serviceLinkHandlers[serviceName], services[serviceName].cartAddress);
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

$(document).ready(addCurrentWorksheet);