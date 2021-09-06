//global variables needed to function
var multiSelected = [];
var plot1SVG, plot2SVG, chartSVG;
var meanObj = { leftMean1: 0, leftMean2: 0, rightMean1: 0, rightMean2: 0 }
var colorObj = { color1: '#1f77b4', color2: '#ff7f0e' }
var trees = [];
var renderedTrees = [];
var multiChildren1 = [];
var multiChildren2 = [];
var leavesOne = [];
var leavesTwo = [];


var TreeCompare = function () {
    //console.log("multiChildren1: ", multiChildren1)
    //console.log("leavesOne: ", leavesOne)
    var longestNode = {};

    var backupRoot = [];
    var gistID = "";

    //global variable set if manual reroot used!!!
    var manualReroot = false;
    var scaleLineWidth = 0;
    var scaleLinePadding = 10;
    var compareMode = false;

    // global variables for undo functionality
    var undoIndex = 0;
    var undoTreeDataIndex = [];
    var undoActionFunc = [];
    var undoActionData = [];
    var undoFullTreeData = [];

    //global variable for multi-selecting

    var chart;
    var nameObj = { node1: "Node 1", node2: "Node 2" }
    var img_jpg_plot1 = d3.select('#jpg_plot1');
    var img_jpg_plot2 = d3.select('#jpg_plot2');

    /*
     colors for the color scale for comparing nodes to best common node

     blue - green - yellow - red
     ['rgb(255,51,51)', 'rgb(255,255,51)', 'rgb(153,255,51)', 'rgb(51,255,51)', 'rgb(51,255,255)', 'rgb(51,51,255)'];

     red - blue
     ['rgb(0,33,229)', 'rgb(70,8,225)', 'rgb(162,16,221)', 'rgb(218,24,190)', 'rgb(214,31,110)', 'rgb(210,39,39)'];
     */
    //grey - black
    var colorScaleRange = ['rgb(37,52,148)', 'rgb(44,127,184)', 'rgb(65,182,196)', 'rgb(127,205,187)', 'rgb(199,233,180)', 'rgb(255,255,204)'];
    var colorScaleRangeRest = ['rgb(179,0,0)', 'rgb(227,74,51)', 'rgb(252,141,89)', 'rgb(253,187,132)', 'rgb(253,212,158)', 'rgb(254,240,217)'];

    var colorScaleDomain = [1, 0.8, 0.6, 0.4, 0.2, 0];
    var padding = 20;
    var paddingVertical = 0;
    var paddingHorizontal = 50;
    var triangleHeightDivisor = 4;
    var currentS = "elementS";
    var currentBCN = "elementBCN";
    var highlightedNodes = [];
    var maxHighlightedNodes = 20;

    var settings = {
        gistSaveServerURL: "http://phylo.io/server/gist.php",
        useLengths: true,
        hideLabels: false,
        alignTipLables: false,
        selectMultipleSearch: false,
        fontSize: 14,
        lineThickness: 3,
        nodeSize: 4,
        treeWidth: 500,
        treeHeight: 15,
        moveOnClick: true,
        enableZoomSliders: true,
        scaleMin: 0.05,
        scaleMax: 5,
        scaleColor: "black",
        loadingCallback: function () {
        },
        loadedCallback: function () {
        },
        internalLabels: "none", //none, name, length, similarity
        enableDownloadButtons: true,
        enableCloudShare: true,
        enableLadderizeTreeButton: true,
        enableOppositeTreeActions: true,
        enableFisheyeZoom: false,
        enableScale: true,
        zoomMode: "traditional", //semantic, traditional
        fitTree: "scale", //none, scale
        enableSizeControls: true,
        enableSearch: true,
        autoCollapse: null
    };



    //Add a work helper function to the jQuery object
    $.work = function (args) {
        var def = $.Deferred(function (dfd) {
            var worker;
            if (window.Worker) {
                //Construct the Web Worker
                worker = new Worker(args.file);
                worker.onmessage = function (event) {
                    //If the Worker reports success, resolve the Deferred
                    dfd.resolve(event.data);
                };
                worker.onerror = function (event) {
                    //If the Worker reports an error, reject the Deferred
                    dfd.reject(event);
                };
                worker.postMessage(args.args); //Start the worker with supplied args
            } else {
                //Need to do something when the browser doesn't have Web Workers
            }
        });

        //Return the promise object (an "immutable" Deferred object for consumers to use)
        return def.promise();
    };

    /*
     called externally to get the TreeCompare object
     */
    function init(settingsIn) {
        var mySettings = settingsIn ? settingsIn : {};
        changeTreeSettings(mySettings);
        return this;
    }

    /*
     called on window resize to ensure the svg canvas fits the parent container
     */
    function resize() {
        for (var i = 0; i < renderedTrees.length; i++) {
            var data = renderedTrees[i].data;
            $("#" + data.canvasId + " > svg").width($("#" + data.canvasId).width());
            $("#" + data.canvasId + " > svg").height($("#" + data.canvasId).height());
        }

    }

    window.onresize = resize;

    /*
     create ID with random number generator
     */
    function makeId(prefix) {
        prefix || (prefix = '');
        var output = prefix + idCounter;
        idCounter++;
        return output;
    }

    function getSetting(currentSetting, lastSetting) {
        if (currentSetting !== undefined) {
            return currentSetting;
        } else {
            return lastSetting;
        }
    }

    /*
     external function for changing settings in order to display features on tree canvas
     */
    function changeCanvasSettings(settingsIn) {
        settings.enableZoomSliders = getSetting(settingsIn.enableZoomSliders, settings.enableZoomSliders);
        settings.enableDownloadButtons = getSetting(settingsIn.enableDownloadButtons, settings.enableDownloadButtons);
        settings.enableCloudShare = getSetting(settingsIn.enableCloudShare, settings.enableCloudShare);
        settings.enableLadderizeTreeButton = getSetting(settingsIn.enableLadderizeTreeButton, settings.enableLadderizeTreeButton);
        settings.enableFixedButtons = getSetting(settingsIn.enableFixedButtons, settings.enableFixedButtons);
        settings.enableSizeControls = getSetting(settingsIn.enableSizeControls, settings.enableSizeControls);
        settings.enableSearch = getSetting(settingsIn.enableSearch, settings.enableSearch);
        settings.autoCollapse = getSetting(settingsIn.autoCollapse, settings.autoCollapse);
        settings.enableScale = getSetting(settingsIn.enableScale, settings.enableScale);
    }

    /*
     external function for changing settings, any rendered trees are updated
     */
    function changeTreeSettings(settingsIn) {
        settings.useLengths = getSetting(settingsIn.useLengths, settings.useLengths);
        settings.hideLabels = getSetting(settingsIn.hideLabels, settings.hideLabels);
        settings.alignTipLabels = getSetting(settingsIn.alignTipLabels, settings.alignTipLabels);
        settings.mirrorRightTree = getSetting(settingsIn.mirrorRightTree, settings.mirrorRightTree);
        settings.selectMultipleSearch = getSetting(settingsIn.selectMultipleSearch, settings.selectMultipleSearch);
        settings.fontSize = getSetting(settingsIn.fontSize, settings.fontSize);
        settings.lineThickness = getSetting(settingsIn.lineThickness, settings.lineThickness);
        settings.nodeSize = getSetting(settingsIn.nodeSize, settings.nodeSize);
        settings.treeWidth = getSetting(settingsIn.treeWidth, settings.treeWidth);
        settings.treeHeight = getSetting(settingsIn.treeHeight, settings.treeHeight);
        settings.moveOnClick = getSetting(settingsIn.moveOnClick, settings.moveOnClick);
        settings.scaleMin = getSetting(settingsIn.scaleMin, settings.scaleMin);
        settings.scaleMax = getSetting(settingsIn.scaleMax, settings.scaleMax);
        settings.scaleColor = getSetting(settingsIn.scaleColor, settings.scaleColor);
        settings.loadingCallback = getSetting(settingsIn.loadingCallback, settings.loadingCallback);
        settings.loadedCallback = getSetting(settingsIn.loadedCallback, settings.loadedCallback);
        settings.internalLabels = getSetting(settingsIn.internalLabels, settings.internalLabels);
        settings.zoomMode = getSetting(settingsIn.zoomMode, settings.zoomMode);
        settings.fitTree = getSetting(settingsIn.fitTree, settings.fitTree);
        settings.gistSaveServerURL = getSetting(settingsIn.gistSaveServerURL, settings.gistSaveServerURL);

        var i;
        if (!(settingsIn.treeWidth === undefined)) {
            for (i = 0; i < trees.length; i++) {
                jQuery.extend(trees[i].data, {
                    treeWidth: settingsIn.treeWidth
                });
            }
        }
        if (!(settingsIn.treeHeight === undefined)) {
            for (i = 0; i < trees.length; i++) {
                jQuery.extend(trees[i].data, {
                    treeHeight: settingsIn.treeHeight
                });
            }
        }


        updateAllRenderedTrees();
    }


    /*
     function to update currently rendered trees when settings are changed
     */
    function updateAllRenderedTrees() {
        for (var i = 0; i < renderedTrees.length; i++) {
            update(renderedTrees[i].data.root, renderedTrees[i].data);
        }
    }

    function getLabelsFromProperties(json, hasChildren) {
        var output = "";
        if (json.clickedHighlight && hasChildren) {
            output += "@@clickedHighlight"
        }
        if (json.bcnhighlight && hasChildren) {
            output += "@@bcnhighlight";
        }
        if (json.collapsed && hasChildren) {
            output += "@@collapsed";
        }
        if (json.clickedParentHighlight) {
            output += "@@clickedParentHighlight";
        }
        if (json.correspondingHighlight) {
            output += "@@correspondingHighlight";
        }
        return output;
    }

    /*
    parse json when shared tree is loaded, ensures that adjusted visualization parameters are preserved
     */
    function jsonToNwk(json, addLabels) {
        //TODO: here add searchHighlihgt and make sure that branchlengths are preserved
        function nested(nest) {
            var subtree = "";

            if (nest.hasOwnProperty('children')) {
                var children = [];
                nest.children.forEach(function (child) {
                    var subsubtree = nested(child);
                    children.push(subsubtree);
                });
                var substring = children.join();
                if (nest.hasOwnProperty('name')) {
                    subtree = "(" + substring + ")" + nest.name;
                    if (addLabels) {
                        subtree += getLabelsFromProperties(nest, true);
                    }
                }
                if (nest.hasOwnProperty('length')) {
                    subtree = subtree + ":" + nest.length;
                }
            } else {
                var leaf = "";
                if (nest.hasOwnProperty('name')) {
                    leaf = nest.name;
                    if (addLabels) {
                        leaf += getLabelsFromProperties(nest, false);
                    }
                }
                if (nest.hasOwnProperty('length')) {
                    leaf = leaf + ":" + nest.length;
                }
                subtree = subtree + leaf;
            }
            return subtree;
        }

        return nested(json) + ";";
    }

    /*
     This function checks the consistency of the input string for the tree
     */
    function checkTreeInput(s) {
        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/);
        var outError = "";

        function returnNumElementInArray(inArray, element) {
            var numOfTrue = 0;
            for (var i = 0; i < inArray.length; i++) {
                if (inArray[i] === element)
                    numOfTrue++;
            }
            return numOfTrue;
        }

        if (returnNumElementInArray(tokens, "(") > returnNumElementInArray(tokens, ")")) {
            outError = "TooLittle)";
        } else if (returnNumElementInArray(tokens, "(") < returnNumElementInArray(tokens, ")")) {
            outError = "TooLittle(";
        } else if (tokens.indexOf(":") === -1 || tokens.indexOf("(") === -1 || tokens.indexOf(")") === -1 || isNaN(tokens[tokens.indexOf(":") + 1])) {
            outError = "NotNwk"
        }

        return outError;
    }

    /*
     JSON to Newick converter, just copied code from:
     https://github.com/daviddao/biojs-io-newick/blob/master/src/newick.js
     ==> Should we include the whole library, instead?
     */
    function tree2Newick(tree) {
        function nested(nest) {
            var subtree = "";

            if (nest.hasOwnProperty('children')) {
                var children = [];
                nest.children.forEach(function (child) {
                    var subsubtree = nested(child);
                    children.push(subsubtree);
                });
                var substring = children.join();
                if (nest.hasOwnProperty('name')) {
                    subtree = "(" + substring + ")" + nest.name;
                }
                if (nest.hasOwnProperty('length')) { // Does length mean branch length?
                    subtree = subtree + ":" + nest.length;
                }
            }
            else if (nest.hasOwnProperty('_children')) {
                var _children = [];
                nest._children.forEach(function (child) {
                    var subsubtree = nested(child);
                    _children.push(subsubtree);
                });
                var substring = _children.join();
                if (nest.hasOwnProperty('name')) {
                    subtree = "(" + substring + ")" + nest.name;
                }
                if (nest.hasOwnProperty('length')) { // Does length mean branch length?
                    subtree = subtree + ":" + nest.length;
                }
            }
            else {
                var leaf = "";
                if (nest.hasOwnProperty('name')) {
                    leaf = nest.name;
                }
                if (nest.hasOwnProperty('length')) {
                    leaf = leaf + ":" + nest.length;
                }
                subtree = subtree + leaf;
            }
            return subtree;
        }

        return nested(tree) + ";";
    }

    function getIdxToken(tokenArray, queryToken) {
        var posTokens = [];
        for (var i = 0; i < tokenArray.length; i++) {
            if (tokenArray[i] === queryToken) {
                posTokens.push(i)
            }
        }
        return posTokens;
    }

    /*
     Newick to JSON converter, just copied code from newick.js
     ==> Should we include the whole library, instead?
     */
    function convertTree(s) { //s is newick file format
        var ancestors = [];
        var tree = {};
        var settingsLbls = [];

        s = s.replace(/(\r\n|\n|\r)/gm, ""); // remove all new line characters

        var tokens = s.split(/\s*(;|\(|\[|\]|\)|,|:)\s*/); //already splits the NHX format as well

        var nhx_tags = [':B', ':S', ':D', ':T', ':E', ':O', ':SO', ':L', ':Sw', ':CO', ':C'];

        // the following part keeps the NHX datastructure
        var square_bracket_start = getIdxToken(tokens, "[");
        var square_bracket_end = getIdxToken(tokens, "]");
        var new_tokens = [];
        var j = 0;
        var i;
        for (i = 0; i < tokens.length; i++) {
            if (tokens[i] === "[") {
                var dist_square_bracket = square_bracket_end[j] - square_bracket_start[j];
                new_tokens.push(tokens[i]);
                new_tokens.push(tokens.slice(i + 1, i + dist_square_bracket).join(""));
                new_tokens.push(tokens[i + dist_square_bracket]);
                i = i + dist_square_bracket;
                j = j + 1;
            } else {
                new_tokens.push(tokens[i]);
            }
        }

        try { //catch error when newick is not in place
            if (tokens === "") {
                throw "empty";
            }// calls convert function from above
        } catch (err) {
            throw "NoTree";
        }

        try {
            if (checkTreeInput(s) === "TooLittle)") {
                throw "empty";
            } // TODO:change this to &&NHX and not []
        } catch (err) {
            throw "TooLittle)"
        }

        function is_nhx_tag_found(nhx_tags, tag_to_check) {
            // prepend with : to differentiate :S=, :Sw= and :SO=
            return jQuery.inArray(":" + tag_to_check, nhx_tags);
        }


        for (i = 0; i < new_tokens.length; i++) {
            var token = new_tokens[i];
            var x;
            var subtree;
            switch (token) {
                case '(': // new children
                    subtree = {};
                    tree.children = [subtree];
                    ancestors.push(tree);
                    tree = subtree;
                    break;
                case ',': // another branch
                    subtree = {};
                    ancestors[ancestors.length - 1].children.push(subtree);
                    tree = subtree;
                    break;
                case '['://input NHX format
                    x = new_tokens[i + 1];
                    if (x.indexOf("&&NHX") !== -1) { //if NHX format

                        var nhx_tokens = x.split(/:/);
                        // TODO, how to differentiate SO and O for example
                        jQuery.each(nhx_tokens, function (i, nhx_token) {

                            var token = nhx_token.split("=");
                            var tmp_idx = is_nhx_tag_found(nhx_tags, token[0])
                            if (tmp_idx !== -1) {
                                var nhxtag = nhx_tags[tmp_idx];
                                var nhxtag_value = token[1];
                                switch (nhxtag) {

                                    case ':B':
                                        settingsLbls.push('name');
                                        tree.branchSupport = nhxtag_value;
                                        break;

                                    case ':S':
                                        settingsLbls.push('species');
                                        tree.species = nhxtag_value;
                                        break;

                                    case ':D':
                                        settingsLbls.push('duplication');
                                        tree.duplication = nhxtag_value;
                                        break;

                                    case ':L':
                                        settingsLbls.push('likelihood');
                                        tree.likelihood = nhxtag_value;
                                        break;

                                    case ':E':
                                        settingsLbls.push('ECNumber');
                                        tree.ECNumber = nhxtag_value;
                                        break;

                                    case ':T':
                                        settingsLbls.push('taxanomyID');
                                        tree.taxanomyID = nhxtag_value;
                                        break;

                                    case ':O':
                                        settingsLbls.push('orthologous');
                                        tree.orthologous = nhxtag_value;
                                        break;

                                    case ':SO':
                                        settingsLbls.push('superorthologous');
                                        tree.superorthologous = nhxtag_value;
                                        break;

                                    case ':Sw':
                                        settingsLbls.push('subtree');
                                        tree.subtree = nhxtag_value;
                                        break;

                                    case ':Co':
                                        settingsLbls.push('collapseThis');
                                        tree.collapseThis = nhxtag_value;
                                        break;
                                    case ':C':
                                        settingsLbls.push('color');
                                        tree.specifiedBranchColor = nhxtag_value;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        });
                    } else {
                        if (!(x === ";" || x === "")) {
                            settingsLbls.push('name');
                            tree.branchSupport = x;
                        }
                    }
                    break;
                case ']':
                case ':': // optional length next
                    break;
                case ')': // optional
                    tree = ancestors.pop();
                    x = new_tokens[i + 1];
                    if (!(x === ";" || x === "")) {
                        settingsLbls.push('name');
                        tree.branchSupport = x;
                    }
                    break;
                default:
                    x = new_tokens[i - 1];
                    if (x === ')' || x === '(' || x === ',') {
                        var tree_meta = token.split("@@"); // separation of metadata for export
                        tree.name = tree_meta[0];
                        tree.length = 0.1; // this is used in the case the tree does not have any branch values
                        tree.collapsed = false;
                        if (tree_meta.indexOf("collapsed") !== -1) {
                            tree.collapsed = true;
                        }
                        if (tree_meta.indexOf("clickedParentHighlight") !== -1) {
                            tree.clickedParentHighlight = true;
                        }
                        if (tree_meta.indexOf("correspondingHighlight") !== -1) {
                            tree.correspondingHighlight = true;
                        }
                        if (tree_meta.indexOf("bcnhighlight") !== -1) {
                            tree.bcnhighlight = true;
                        }
                        if (tree_meta.indexOf("clickedHighlight") !== -1) {
                            tree.clickedHighlight = true;
                        }

                    } else if (x === ':') {
                        tree.length = parseFloat(token);
                    }
            }
        }
        // update settings radiobuttons
        updateSettingsLabels(settingsLbls);

        return tree;
    }

    function updateSettingsLabels(settingsLbls) {

        // update settings radiobuttons
        updateSettingsLabels(settingsLbls);

        return tree;
    }

    function updateSettingsLabels(settingsLbls) {

        // update settings radiobuttons
        // TODO, hide not used radios, what do we show always?
        if (settingsLbls && settingsLbls.length > 0) {

            settingsLbls = settingsLbls.filter(
                function (a) {
                    if (!this[a]) {
                        this[a] = 1;
                        return a;
                    }
                }, {}
            );

            jQuery.each(settingsLbls, function (i, stglbl) {
                $('[name=internalLabels][value=' + stglbl + ']').show().next().show();
            });

        } else {
            /* hide optional radio buttons */
            $('[name=internalLabels] .opt').hide();
        }
    }

    /*
     Called externally and allows to drag and drop text files for tree input
     */
    function inputTreeFile(newickIn) {
        /*
         /
         /    Enable drag and drop
         /
         */
        var MAX_BYTES = 102400; // 100 KB

        function dragEnter(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function dragExit(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function dragOver(event) {
            event.stopPropagation();
            event.preventDefault();
        }

        function drop(event) {
            event.stopPropagation();
            event.preventDefault();
            $("#renderErrorMessage").empty();

            var data = event.dataTransfer;
            var file = data.files;

            var accept = {
                text: ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length - 1];

            if (accept.text.indexOf(file_name_ending) > -1) {
                var reader;
                reader = new FileReader();
                reader.onload = function (event) {
                    if (!(checkTreeInput(event.target.result) === "NotNwk")) {
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if (file[0].name === "") {
                    $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                }
                else {
                    $("#" + newickIn + "Label").val(file[0].name);
                }
            } else {
                $("#renderErrorMessage").empty();
                $("#" + newickIn + "Label").text("No file");
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
            }
            // object for allowed media types
        }

        function onFileLoaded(event) {
            event.currentTarget.result.substr(0, MAX_BYTES);
        }

        var dropArea = $("#" + newickIn).get(0);

        dropArea.addEventListener("dragenter", dragEnter, false);
        dropArea.addEventListener("dragexit", dragExit, false);
        dropArea.addEventListener("dragover", dragOver, false);
        dropArea.addEventListener("drop", drop, false);

        /*
         /
         /    Enable file input using button
         /
         */
        var newickInButton = document.getElementById(newickIn + "Button");
        var control = document.getElementById(newickIn + "File");
        newickInButton.addEventListener('click', function (event) {
            event.preventDefault();
            control.click();
        }, false);


        control.addEventListener("change", function (event) {

            // When the control has changed, there are new files
            var file = control.files;

            var accept = {
                text: ["txt", "nh", "nhx", "nwk", "tre", "tree"]
            };

            var file_name_tokens = file[0].name.split(".");
            var file_name_ending = file_name_tokens[file_name_tokens.length - 1];

            if (accept.text.indexOf(file_name_ending) > -1) {
                var reader = new FileReader();
                reader.onload = function (event) {
                    if (!(checkTreeInput(event.target.result) === "NotNwk")) {
                        $("#" + newickIn).val(event.target.result);
                        $("#renderErrorMessage").empty();
                    } else {
                        $("#renderErrorMessage").empty();
                        $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">This is not a tree file!</div>')).hide().slideDown(300);
                        $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                        $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
                    }

                };
                reader.onloadend = onFileLoaded;
                reader.readAsText(file[0]);
                if (file[0].name === "") {
                    $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                }
                else {
                    $("#" + newickIn + "Label").val(file[0].name);
                }

            } else {
                $("#renderErrorMessage").empty();
                $("#renderErrorMessage").append($('<div class="alert alert-danger" role="alert">Only the following file endings are accepted: txt, nh, nhx, nwk, tre, tree</div>')).hide().slideDown(300);
                $("#" + newickIn + "Label").attr("placeholder", "Untitled").val("");
                $("#" + newickIn).attr("placeholder", "Paste your tree or drag and drop your tree file here").val("");
            }


        }, false);

    }

    function resetTreeVisStatus(treeCollection) {
        if (treeCollection.length > 0) {
            for (var i = 0; i < treeCollection.length; i++) {
                treeCollection[i].display = false;
            }
        }
    }


    // function that returns length of triangle at each node important to calculate how to fix position into all visible space
    function getCollapsedTriangleLength(node) {
        var total = getTotalLength(node);
        var avg = total / node.leaves.length;
        return avg;
    }

    /*
     Called externally to convert a tree and add to internal tree structure
     */
    function addTree(newick, myName, mode) {

        var num = trees.length;
        var idCounter = 0;

        var tmpNewicks;
        var newicks = [];
        // this is important to allow trees to be separated by ";", or "\n" and also to have black lines
        if (newick.indexOf(";") !== -1) {
            tmpNewicks = newick.replace(/(^[ \t]*\n)/gm, "").replace(/(\r\n|\n|\r)/gm, "").split(";");
            if (tmpNewicks.length > 1) {
                newicks = tmpNewicks.slice(0, -1);
            }
        } else {
            tmpNewicks = newick.replace(/(^[ \t]*\n)/gm, "").replace(/(\r\n|\n|\r)/gm, ";").split(";");
            if (tmpNewicks.length > 1) {
                newicks = tmpNewicks.slice(0, -1);
            }
        }
        // reset settings radiobuttons
        updateSettingsLabels();

        resetTreeVisStatus(trees);
        // the following is important to allow the support to load multiple trees at once
        // multiple trees from the text field will be loaded into a tree array that will be given to the main tree object

        for (var i = 0; i < newicks.length; i++) {
            var count = (num + i);
            var name = "Tree_" + count;

            var tree = convertTree(newicks[i]);

            var leaves = getChildLeaves(tree).sort();
            for (var j = 0; j < leaves.length; j++) {
                leaves[j].ID = Math.pow(2, j);
                //console.log(leaves[j].ID);
            }

            //add required parameters to each node
            postorderTraverse(tree, function (d) {
                d.keep = true;
                d.ID = name + "_node_" + idCounter;
                d.leaves = getChildLeaves(d);
                d.clickedParentHighlight = false;
                d.mouseoverHighlight = false; //when mouse is over node
                d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
                d.correspondingHighlight = false;
                d.collapsed = false; //variable to obtain the node/nodes where collapsing starts
                idCounter++;
            });

            var fullTree = {
                root: tree,
                name: name,
                mode: mode,
                display: true,
                part: i, // index part of the collection of trees
                last: (num + newicks.length - 1), // index of last tree
                data: {}
            };

            if (newicks.length > 1) {
                fullTree.multiple = true;
                fullTree.total = newicks.length;
            } else {
                fullTree.total = 1;
            }
            fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(tree);

            trees.push(fullTree);
        }
        return trees[(trees.length - newicks.length)];
    }

    /*
    depending on number of leaves function returns optimal collapsing depth
     */
    function getRecommendedAutoCollapse(root) {
        var leafCount = root.leaves.length;
        if (leafCount < 50) {
            return null;
        } else {
            //return (Math.floor(Math.log(leafCount)) + 1);
            // how many levels will be expanded, 10 is pushing it
            return (Math.floor(Math.log(leafCount)) > 8 ? 10 : (Math.floor(Math.log(leafCount) + 3)));
        }

    }

    /*
    depending on number of splits function returns maximum number of collapsing depth
     */
    function getMaxAutoCollapse() {
        var maxDepth = [];

        for (var i = 0; i < renderedTrees.length; i++) {
            var maxDepthTmp = 0;
            postorderTraverse(renderedTrees[i].root, function (e) {
                if (e.depth > maxDepthTmp) {
                    maxDepthTmp = e.depth;
                }
            }, true);
            maxDepth.push(maxDepthTmp);
        }
        return Math.max.apply(Math, maxDepth) - 1;
    }

    /*
     return trees in tree array trees
     */
    function getTrees() {
        return trees
    }

    /*
    remove a tree from array of trees
     */
    function removeTree(name) {
        trees.splice(findTreeIndex(name), 1);
        for (var i = 0; i < renderedTrees.length; i++) {
            if (renderedTrees[i].name === name) {
                $("#" + renderedTrees[i].data.canvasId).empty();
                if (renderedTrees[i].data.scaleId && settings.enableScale) {
                    $(renderedTrees[i].data.scaleId).empty();
                }
            }
        }
    }

    /*
     Function to find maxBranchSupport in order to scale branchSupport values between 0 and 1
     1) [0,1]
     2) [0,100]
     3) [0,1000] swisstree only
     */
    function findScaleValueBranchSupport(tree) {
        var branchSupport = [];
        postorderTraverse(tree, function (d) {
            if (d["branchSupport"]) {
                branchSupport.push(d["branchSupport"])
            }
        });
        var tmpMaxBranchSupport = Math.max.apply(Math, branchSupport);

        if (tmpMaxBranchSupport <= 1) {
            maxBranchSupport = 1
        } else if (tmpMaxBranchSupport <= 100) {
            maxBranchSupport = 100
        } else if (tmpMaxBranchSupport <= 1000) {
            maxBranchSupport = 1000
        }
        else {
            maxBranchSupport = undefined
        }

    }

    /*
     Can be called externally to render the color scale for tree comparison in a div
     */
    function renderColorScale(scaleId) {
        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);
        var width = 75;
        var steps = 10;
        var height = 25;
        var svgHeight = height + 20;
        var svg = d3.select("#" + scaleId).append("svg")
            .attr("width", width + "px")
            .attr("height", svgHeight + "px")
            .append("g");
        svg.append("svg:title").text("Similarity to most common node");

        for (var i = 0; i < steps; i++) {
            svg.append("rect")
                .attr("width", (width / steps) + "px")
                .attr("height", height + "px")
                .attr("fill", colorScale(i / steps))
                .attr("x", ((width / steps) * i) + "px")
        }
        svg.append("text")
            .text("0")
            .attr("x", 0)
            .attr("y", height + 10)
            .attr("fill", "black");
        // .attr("font-weight", 600);
        svg.append("text")
            .text("1")
            .attr("x", width - 8)
            .attr("y", height + 10)
            .attr("fill", "black");
        // .attr("font-weight", 600);
    }

    /*
     Can be called externally to render the color scale for tree comparison in a div
     */
    // function renderColorScale(scaleId) {
    //     var colorScale = d3.scale.linear()
    //         .domain(colorScaleDomain)
    //         .range(colorScaleRange);
    //     var width = 200;
    //     var steps = 100;
    //     var height = 30;
    //     var svgHeight = height + 25;
    //     var svg = d3.select("#" + scaleId).append("svg")
    //         .attr("width", width + "px")
    //         .attr("height", svgHeight + "px")
    //         .append("g");
    //     for (var i = 0; i < steps; i++) {
    //         svg.append("rect")
    //             .attr("width", (width / steps) + "px")
    //             .attr("height", height + "px")
    //             .attr("fill", colorScale(i / steps))
    //             .attr("x", ((width / steps) * i) + "px")
    //     }
    //     svg.append("text")
    //         .text("0")
    //         .attr("x", 0)
    //         .attr("y", height + 20)
    //         .attr("fill", "white");
    //     svg.append("text")
    //         .text("1")
    //         .attr("x", width - 10)
    //         .attr("y", height + 20)
    //         .attr("fill", "white")
    //
    // }

    /*
    Function that returns unvisible children or visible children if one or the other are given as input
     */
    function getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }

    /*
    Changes text in the length scale according to changes in vis
     */
    function applyScaleText(scaleText, zoomScale, root) {
        if (root.children || root._children) {
            var children = getChildren(root);
            var length = 0;
            var offset = 0;
            for (var i = 0; i < children.length; i++) {
                length = getLength(children[i]);
                offset = children[i].baseY;
                var test_length = length.toFixed(3);
                if (test_length !== 0 && offset !== 0) { //take the first one unequal zero
                    break;
                }
            }
            var text = (((scaleLineWidth / offset) * length) / zoomScale).toFixed(2);
            scaleText.text(text);
        }
    }

    /*
     returns number of leaf nodes that are children of d (includes self if self is leaf)
     */
    function getTotalChildLeaves(d) {
        if (d.children || d._children) {
            var total = 0;
            var children = getChildren(d);
            for (var i = 0; i < children.length; i++) {
                total = total + getTotalChildLeaves(children[i]);
            }
            return total;
        } else {
            return 1;
        }
    }

    /*
     returns number of leaf nodes that are children of d (includes self if self is leaf)
     */
    function getTotalChildNodes(d) {
        var totalNodes = 0;
        postorderTraverse(d, function () {
            totalNodes++;
        }, true);
        return totalNodes;
    }

    /*
     returns list of leaf nodes that are children of d
     */
    function getChildLeaves(d) {
        if (d.children || d._children) {
            var leaves = [];
            var children = getChildren(d);
            for (var i = 0; i < children.length; i++) {
                leaves = leaves.concat(getChildLeaves(children[i]));
            }
            return leaves;
        } else {
            return [d];
        }
    }

    /*
     Adds d as the parent value of all of its children
     */
    function addParents(d) {
        var children = getChildren(d);
        for (var i = 0; i < children.length; i++) {
            children[i].parent = d;
            addParents(children[i]);
        }
    }

    /*

     ! THIS FUNCTION BREAKS THE DISPLAY OF THE TREE (SHRUNK)
     ! REPLACED BY A OLD VERSION:
     ! https://github.com/DessimozLab/phylo-io/blob/8c7596b04c3b602b7da915f0d62675f684fd3744/www/js/treecompare.js

     function getMaxLengthVisible(root) {
     var max = 0;
     function getMax_internal(d,distfromroot) {
     distfromroot+=d.length;
     if (d.children) {
     var children = getChildren(d);
     for (var i = 0, ilim=children.length; i < ilim; i++) {
     getMax_internal(children[i],distfromroot);
     }
     } else {
     if (distfromroot>max) max = distfromroot;
     }
     }
     getMax_internal(root,0);
     return max;
     }*/


    /*
     returns longest visible branch or triangle
     */
    function getMaxLengthVisible(root) {
        var max = 0;

        function getMax_internal(d, max) {
            if (d.children) {
                var children = d.children;
                for (var i = 0; i < children.length; i++) {
                    max = Math.max(getMax_internal(children[i], max), max)
                }
                return max;
            } else {
                var maxLength = (typeof d.triangleLength == 'undefined' || d.length > d.triangleLength) ? d.length : d.triangleLength;
                if (maxLength > max) {
                    longestNode = d;
                    return maxLength;
                }
                return max;
            }
        }

        return getMax_internal(root, max);
    }

    function getMaxLength(root) {

        var max = 0;

        function getMax_internal(d, max) {
            if (d.children || d._children) {
                var children = getChildren(d);
                for (var i = 0; i < children.length; i++) {
                    max = Math.max(getMax_internal(children[i], max), max)
                }
                return max;
            } else {
                return (d.length ? Math.max(d.length, max) : max)
            }
        }

        return getMax_internal(root, max);

    }

    function getTotalLength(node) {
        var sum = 0;

        postorderTraverse(node, function (d) {
            sum += d.length;
        }, true);

        return sum;
    }

    /*
     get total length of a node from root
     */
    function getLength(d) {
        if (d.parent) {
            return d.length + getLength(d.parent);
        } else {
            return 0;
        }
    }

    /*
     Description:
     Traverses and performs function f on treenodes in postorder
     Arguments:
     d: the tree object
     f: callback function
     do_children (optional, default: true): consider invisible children?
     Comments:
     if do_children === false, doesn't traverse _children, only children
     _children means the children are not visible in the visualisation, i.e they are collapsed
     */
    function postorderTraverse(d, f, do_children) {
        if (do_children === undefined) { //check whether variable is defined, e.g. string, integer ...
            do_children = true;
        }
        var children = [];
        if (do_children) {
            children = getChildren(d);
        } else {
            if (d.children) {
                children = d.children
            }
        }
        if (children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                postorderTraverse(children[i], f, do_children);
            }
            f(d);
            return;

        } else {
            f(d);
            return;
        }
    }
    /*
     function important for rerooting to create new top leave root node
     */
    function newNode(d) { // private method
        return {
            parent: null,
            children: [],
            name: "",
            ID: "",
            length: 0,
            mouseoverHighlight: false,
            mouseoverLinkHighlight: false,
            elementS: d.elementS
        };
    }

    /*
     Function to dynamically reroot a tree at a specific node
     Taken and adapted from knlh.js....
     tree = tree.root
     newRoot = d
     */
    /* Reroot: put the root in the middle of node and its parent */
    function reroot(tree, node) {
        var idCount = 0;
        var root = tree.root;
        var name = tree.name;
        if (node.parent !== root) {

            if (manualReroot == false) {//ensure that always the lengths of branches are conserved!
                backupRoot = root;
                manualReroot = true;
            } else {
                root = backupRoot;
            }

            var i, d, tmp;
            var btmp, bd;
            var p, q, r, s, new_root;
            if (node == root) return root;
            var dist = node.length / 2;
            tmp = node.length;
            btmp = node.branchSupport;
            /* p: the central multi-parent node
             * q: the new parent, previous a child of p
             * r: old parent
             * i: previous position of q in p
             * d: previous distance p->d
             */
            q = new_root = newNode(node.parent); //node.parent ensures the correct coulering of the branches when rerooting
            q.children[0] = node; //new root
            //q.children[0].ID = node.ID;
            q.children[0].length = dist;
            q.children[0].branchSupport = btmp;
            p = node.parent;
            q.children[0].parent = q;
            for (i = 0; i < p.children.length; ++i)
                if (p.children[i] == node) break;
            q.children[1] = p;
            //q.children[1].ID =  makeId("node_");
            d = p.length;
            bd = p.branchSupport;
            p.length = tmp - dist;
            p.branchSupport = btmp;
            r = p.parent;
            p.parent = q;


            while (r != null) {
                s = r.parent;
                /* store r's parent */
                p.children[i] = r;
                /* change r to p's children */
                for (i = 0; i < r.children.length; ++i) /* update i */
                    if (r.children[i] == p) break;
                r.parent = p;
                /* update r's parent */
                tmp = r.length;
                r.length = d;
                d = tmp;
                /* swap r->d and d, i.e. update r->d */
                btmp = r.branchSupport;
                r.branchSupport = bd;
                bd = btmp;
                q = p;
                p = r;
                r = s;
                /* update p, q and r */
            }


            /* now p is the root node */
            if (p.children.length == 2) { /* remove p and link the other child of p to q */
                r = p.children[1 - i];
                /* get the other child */
                for (i = 0; i < q.children.length; ++i) /* the position of p in q */
                    if (q.children[i] == p) break;
                r.length += p.length;
                r.parent = q;
                q.children[i] = r;
                /* link r to q */
            } else { /* remove one child in p */
                for (j = k = 0; j < p.children.length; ++j) {
                    p.children[k] = p.children[j];
                    if (j != i) ++k;

                }
                --p.children.length;
            }

            //var idCounter = 0;
            tree.root = new_root;
            tree.data.root = tree.root; //create clickEvent that is given to update function

            postorderTraverse(tree.root, function (d) {
                //d.bcnhighlight = null;
                //d.highlight = 0;
                //d.clickedHighlight = null;
                d.ID = name + "_node_" + idCount; // reset the IDs after rerooting
                d.leaves = getChildLeaves(d);
                idCount++;
            }, true);

            // if searchbar shown hide it when rerooting and remove all search highlight
            d3.selectAll(".link").attr("class", "link");
            //hideSearchBar(tree.data.canvasId);

            return tree;
        } else {
            return tree;
        }
    }


    function getTreeFromCanvasId(id) {
        var name = $("#" + id + " > svg").attr('id');
        return trees[findTreeIndex(name)];

    }


    /*---------------
     /
     /    EXTERNAL: Function to create URL with attached gist-ID for export of visualization
     /
     ---------------*/
    function exportTreeToGist(isCompared) {

        /*
         Function to write JSON structure to gist
         */
        function writeJSONtoGist(sourceData, callback) {
            var currentTrees = sourceData;

            // get original newick since parser can not handle _children
            postorderTraverse(currentTrees.root, function (d) {
                if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
            });

            var nwk_original = jsonToNwk(currentTrees.root, false);
            var nwk_collapsed = jsonToNwk(currentTrees.root, true);


            var dataOut = currentTrees.name + "$$" + nwk_original + "$$" + nwk_collapsed;
            postorderTraverse(currentTrees.root, function (d) {
                if (d.collapsed) {
                    d._children = d.children;
                    d.children = null;
                }
            });

            var tmp = {
                "description": "a gist for a user with token api call via ajax",
                "public": true,
                "files": { "file1.json": { "content": dataOut } }
            };

            return $.ajax({
                async: false,
                url: settings.gistSaveServerURL,
                type: 'POST',
                dataType: 'json',
                data: { jsondata: JSON.stringify(tmp) },
                success: callback

            });

        }

        var tmpURL = window.location.href.split("#");
        var outURL = tmpURL[0] + "#";
        var tree1;

        if (isCompared) {
            tree1 = trees[trees.length - 2];
            var tree2 = trees[trees.length - 1];

            var gistID1;
            var gistID2;
            writeJSONtoGist(tree1, function (data) {
                gistID1 = data.id;
            });

            writeJSONtoGist(tree2, function (data) {
                gistID2 = data.id;
            });

            if (gistID1 === undefined || gistID2 === undefined) {
                return "Error: Gists could not be created";
            }

            outURL += encodeURIComponent(gistID1 + "-" + gistID2);

        } else {
            tree1 = trees[trees.length - 1];
            var gistID;
            writeJSONtoGist(tree1, function (data) {
                gistID = data.id;
            });

            if (gistID === undefined) {
                return "Error: Gist could not be created";
            }

            outURL += encodeURIComponent(gistID);
        }


        return outURL;

    }


    /*---------------
     /
     /    EXTERNAL: Function to retrieve visualization using tree obtained from gist
     /
     ---------------*/
    function addTreeGistURL(gistID, name) {

        var newTree;

        try {

            var request = new XMLHttpRequest();
            request.open('GET', settings.gistSaveServerURL + "?gistid=" + gistID, false);
            request.send(null);

            if (request.status === 200) {
                newTree = JSON.parse(request.responseText).files['file1.json'].content;
            } else {
                throw "Error: Github Gist was not found! (" + request.status + ")";
            }

        } catch (e) {

            $('#modalTitleError').html('Github Error');
            $('#modalBodyError').html(e);
            $('#myErrorModal').modal('show');
            return false;

        }


        var idCounter = 0;
        settings.autoCollapse = null;
        if (name === undefined) {
            var num = trees.length;
            name = "Tree " + num;
        }

        //console.log(newTree);
        var parsedNwk = newTree.split("$$");
        try {
            var collapsedInfoTree = convertTree(parsedNwk[2]); // calls convert function from above
        } catch (err) {
            throw "Invalid Newick";
        }

        postorderTraverse(collapsedInfoTree, function (d) {
            d.ID = name + "_node_" + idCounter;
            d.leaves = getChildLeaves(d);
            d.mouseoverHighlight = false; //when mouse is over node
            d.mouseoverLinkHighlight = false; //when mouse is over branch between two nodes
            idCounter++;
        });

        var fullTree = {
            root: collapsedInfoTree,
            name: name,
            nwk: parsedNwk[1],
            compare: false,
            data: {}
        };
        fullTree.data.autoCollapseDepth = getRecommendedAutoCollapse(collapsedInfoTree);

        trees.push(fullTree);


        return fullTree

    }

    function rgb2hex(rgbString) {

        var rgb = rgbString.split(".");

        var R = parseInt(rgb[0]);
        var G = parseInt(rgb[1]);
        var B = parseInt(rgb[2]);

        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(R) + componentToHex(G) + componentToHex(B);

    }

    function ladderizeTree(tree, direction) {


        function sortChildrenByNumLeaves(d, tree, direction) {
            var childIdxToLeaveNumMap = {};

            for (var i = 0; i < d.children.length; i++) {
                childIdxToLeaveNumMap[i] = d.children[i].leaves.length
            }
            // Create items array
            var items = Object.keys(childIdxToLeaveNumMap).map(function (key) {
                return [parseInt(key), childIdxToLeaveNumMap[key]];

            });

            if (direction == 'ascending') {
                items.sort(function (first, second) {
                    return second[1] - first[1]
                });
            }
            else if (direction == 'descending') {
                items.sort(function (first, second) {
                    return first[1] - second[1]
                });
            }
            settings.loadingCallback();
            setTimeout(function () {
                // here the actual rotation happens
                var tmp = [];
                for (var i = 0; i < items.length; i++) {
                    tmp.push(d.children[items[i][0]]);
                }
                d.children = tmp;

                update(d, tree.data);

                settings.loadedCallback();
            }, 2);

        }

        postorderTraverse(tree.root, function (d) {
            //console.log(d);
            if (d.children && d.parent) {
                var currentNode = d;
                sortChildrenByNumLeaves(d, tree, direction);
            } else if (!d.parent) {
                sortChildrenByNumLeaves(d, tree, direction);
            }
        });

    }


    function inChildren1(d) {
        for (i = 0; i < multiChildren1.length; i++) {
            if (multiChildren1[i] == d) {
                return true
            }
        }
        return false
    }
    function inChildren2(d) {
        for (i = 0; i < multiChildren2.length; i++) {
            if (multiChildren2[i] == d) {
                return true
            }
        }
        return false
    }

    /*---------------
     /
     /    UPDATE: Main function that is every time called once an action on the visualization is performed
     /
     ---------------*/
    function update(source, treeData, duration, treeToggle) {

        //time taken for animations in ms
        if (duration === undefined) {
            duration = 750;
        }

        if (treeToggle === undefined) {
            treeToggle = false;
        } else {
            duration = 1;
        }
        if (treeToggle === true) {
            duration = 0;
        }

        // Color scale for compare mode and bcn values from light yellow to dark blue
        var colorScale = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRange);

        // Color scale for branchsupport from white to dark red
        var colorScaleRest = d3.scale.linear()
            .domain(colorScaleDomain)
            .range(colorScaleRangeRest);

        // Compute the new tree layout.
        var nodes = treeData.tree.nodes(treeData.root).reverse();
        var links = treeData.tree.links(nodes);

        var leaves = treeData.root.leaves.length;
        var leavesVisible = getVisibleLeaves(treeData.root);

        var height = $(".vis-container").height();
        var renderHeight = height - paddingVertical * 2;
        var leavesHidden = 0;
        var triangles = 0;
        postorderTraverse(treeData.root, function (d) {
            if (d._children) {
                leavesHidden += d.leaves.length;
                triangles += 1;
            }
        }, false);

        var newHeight;

        //calculate treeHeight if we are squashing tree into visible space
        if (settings.fitTree === "scale" && treeData.prevNoLeavesVisible) {
            var newHeight = 1;
            if (leavesVisible > 0) {
                newHeight = renderHeight / (leavesVisible + leavesHidden);
                treeData.treeHeight = newHeight;
            }
        }
        if (settings.fitTree === "scale" && leavesVisible === 0 && !treeData.prevNoLeavesVisible) {
            newHeight = renderHeight / (leavesVisible + leavesHidden);
            newHeight = (newHeight * triangleHeightDivisor);
            newHeight = newHeight - (newHeight / triangleHeightDivisor / 2);
            treeData.treeHeight = newHeight;
        }
        if (leavesVisible > 0) {
            treeData.prevNoLeavesVisible = false;
        } else {
            treeData.prevNoLeavesVisible = true;
        }

        // False if visible leaves, true otherwise
        // Set to true in renderTree
        treeData.prevNoLeavesVisible = !(leavesVisible > 0);

        var leafHeight = treeData.treeHeight;
        height = leaves * leafHeight;
        var trianglePadding = leafHeight;

        //helper function to calculate all the leaf nodes visible, including the nodes with the collapsing
        //important to scale even big renderings onto the screen
        var visNodes = 0;

        function getLeavesShown(e) {
            function getLeavesShownInner(d) {
                if (d.children) {
                    for (var i = 0; i < d.children.length; i++) {
                        getLeavesShownInner(d.children[i]);
                    }
                } else {
                    visNodes += 1;
                }
            }

            getLeavesShownInner(e);
            return visNodes;
        }

        var allVisLeaves = getLeavesShown(treeData.root);
        var divisor = ((treeData.root.leaves.length - allVisLeaves) > 0) ? allVisLeaves : treeData.root.leaves.length; //number of leaves when collapsed


        //helper function to get info about number of collapsed nodes in a subtree
        function getCollapsedParams(e) {
            var collapsedHeightInner = 0;
            var leavesHiddenInner = 0;

            function getCollapsedHeight(d) {
                if (d._children && !d.children) {
                    var offset = leafHeight / triangleHeightDivisor * d.leaves.length;
                    if (offset < amendedLeafHeight) { //condition ensures the right spacing if the triangle is smaller than the distance between two leaves
                        collapsedHeightInner += amendedLeafHeight;
                    } else {
                        collapsedHeightInner += ((leafHeight / triangleHeightDivisor * d.leaves.length) + (trianglePadding * 2));
                    }
                    leavesHiddenInner += d.leaves.length;
                } else if (d.children) {
                    for (var i = 0; i < d.children.length; i++) {
                        getCollapsedHeight(d.children[i]);
                    }
                }
            }

            getCollapsedHeight(e);
            return {
                collapsedHeight: collapsedHeightInner,
                leavesHidden: leavesHiddenInner
            }
        }

        var params = getCollapsedParams(treeData.root); //helper function getCollapsedParams(e) above is called and saved in params
        var collapsedHeight = params.collapsedHeight; // height of collapsed leaves with collapsed branches
        var amendedLeafHeight = ((treeData.root.leaves.length * leafHeight) - collapsedHeight) / (divisor);
        //calculate the vertical position for a node in the visualisation
        //yes x is vertical position, blame d3's tree vis structure not me...
        var test = 0;
        function setXPos(d, upperBound) {
            var params;
            var collapsedHeight;

            if (d.children) { // defines the vertical position of the inner nodes
                for (var i = 0; i < d.children.length; i++) {
                    setXPos(d.children[i], upperBound);
                    test += 1;

                    params = getCollapsedParams(d.children[i]);
                    collapsedHeight = params.collapsedHeight;
                    var leavesHidden = params.leavesHidden;
                    upperBound += (((d.children[i].leaves.length - leavesHidden) * amendedLeafHeight) + collapsedHeight);
                }
                d.x = d.children[0].x + ((d.children[d.children.length - 1].x - d.children[0].x) / 2);
            } else if (d._children) { //gets the position of the nodes that lead to the triangles
                params = getCollapsedParams(d);
                collapsedHeight = params.collapsedHeight;
                d.x = upperBound + (collapsedHeight / 2);
            } else { // defines the vertical position of the leaves only
                d.x = upperBound + (amendedLeafHeight / 2);
            }
            d.x = d.x;
        }


        /*
         define the vertical position of the shown leaves depending on some bound and traverse this information to all leaves
         */
        function setXPosLeaves(d, upperBound) {
            if (d.children) {
                var newBound = upperBound;
                for (var i = 0; i < d.children.length; i++) {
                    setXPosLeaves(d.children[i], newBound);
                    upperBound += d.children[i].leaves.length * amendedLeafHeight;
                }
            }
        }

        // returns maxLength of tree
        var maxLength = treeData.maxLength;
        // returns length in absolute coordinates of the whole tree

        // magic number?
        var lengthMult = treeData.treeWidth + 90;

        //calculate horizontal position of nodes
        var newLenghtMult = 0;
        nodes.forEach(function (d) {
            if (settings.useLengths) { //setting selected by user
                d.y = getLength(d) * (lengthMult / maxLength); //adjust position to screen size
                d.baseY = d.y;
            } else {
                d.y = d.depth * lengthMult / 10;
                d.baseY = d.y;
                if (d.y > newLenghtMult) {
                    newLenghtMult = d.y
                }
            }
            d.y = d.y - 90;
        });







        // this ensures that when lengths are not used when rerooting the plot is still drawn similar
        if (newLenghtMult > lengthMult) {
            lengthMult = newLenghtMult
        }

        //align tip labels
        nodes.forEach(function (d) {
            if (settings.alignTipLabels && (!d.children || d._children)) {
                d.y = lengthMult - 90;
            }
        });

        //mirror right tree
        if (settings.mirrorRightTree && renderedTrees.length > 1) {
            var treeNameElements = treeData.root.ID.split("_");
            var treeName = treeNameElements[0] + "_" + treeNameElements[1];
            var oppositeTreeName = d3.select("#vis-container2 svg").attr("id");
            var treeIdx = findTreeIndex(oppositeTreeName);


            nodes.forEach(function (d) {
                if (treeName === trees[treeIdx].name && settings.mirrorRightTree) {
                    d.y = lengthMult - d.y;
                }
            });
            //return text width to adjust position of text when mirror
            function getTextWidth(txt) {
                var c = document.createElement("canvas");
                var ctx = c.getContext("2d");
                ctx.font = settings.fontSize + "px Arial";
                var textWidth = ctx.measureText(txt).width;
                return textWidth
            }
        } else {
            var treeIdx = trees.length - 1;
        }

        setXPos(treeData.root, 0);
        // Update the nodes…
        // Assign a unique numeric identifer to each node
        // "zero" being the number of leaves
        var node = treeData.svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++treeData.i);
            })
            .attr("id", function (d) {
                return d.ID;
            });
        // Enter any new nodes at the parent's previous position.
        // Perform the actual drawing

        //Function for mouse over popup
        var popdiv = d3.select("body").append("div")
            .attr("class", "popuptooltip")
            .style("height", "20px")
            .style("opacity", 0);

        var nodeEnter = node.enter().append("g")
            .filter(function (d) { return d.keep })
            .attr("class", "node")
            .attr("transform", function (d) {
                if (source === treeData.root) {
                    if (d.parent) {
                        return "translate(" + d.parent.y + "," + d.parent.x + ")";
                    } else {
                        return "translate(" + source.y0 + "," + source.x0 + ")";
                    }
                } else {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                }
            })
            .attr("id", function (d) {
                return d.ID;
            })
            .on("mouseover", function (d) {
                nodeMouseover(d);
                //console.log(d)
                if (d.name) {
                    popdiv.transition()
                        .duration(200)
                        .style("opacity", .8);
                    popdiv.html("<p> " + d.name + "</p>")
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                }

            })
            .on("mouseout", function (d) {
                nodeMouseout(d)

                popdiv.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", treeData.clickEvent); //comes from getClickEvent

        

        //perform the actual drawing
        nodeEnter.append("circle")
            .attr("class", "node")
            .attr("r", settings.nodeSize * 2)
            .style("fill", function (d) {
                if (multiSelected[0] == d) return colorObj.color1;
                if (multiSelected[1] == d) return colorObj.color2;
            });

        nodeEnter.append("rect")
            .attr("class", "node")
            .attr("y", "-5px")
            .attr("x", "-5px")
            .attr("width", "0px")
            .attr("height", "0px");

        // define visualization of labels on internal nodes
        nodeEnter.append("text")
            .attr("class", "node")

            .attr("x", function (d) {
                if ((!d.children || d._children) && treeName === trees[treeIdx].name && settings.mirrorRightTree) {
                    return -13 - getTextWidth(d.name);
                } else if ((d.children || d._children)) {
                    return -13;
                } else {
                    return 13;
                }

            })
            .attr("dy", function (d) {
                if (!(d.children || d._children)) { //ensures that length labels are on top of branch
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("dx", function (d) {
                if (d.children || d._children) {
                    return ".3em";
                } else {
                    return "-.3em";
                }
            })
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .style("fill-opacity", 1e-6)
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            });

        function inBoth(){
            if(multiChildren1.length > multiChildren2.length){
                return colorObj.color2
            }
            else{
                return colorObj.color1
            }
        }

        nodeEnter.append("text")
            .attr("class", "triangleText")
            .attr("dy", ".35em")
            //.style("fill-opacity", 1e-6)
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            })
            .style("fill", function (d) {
                if(inChildren1(d) && inChildren2(d)){
                    return inBoth()
                }
                else if (inChildren1(d)) {
                    return colorObj.color1;
                }
                else if (inChildren2(d)) {
                    return colorObj.color2;
                }
            });

        nodeEnter.append("path")
            .attr("class", "triangle")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        //instant node changes
        node.select("text")
            .attr("font-size", function (d) {
                return settings.fontSize + "px"
            });

        //Do editing to swtich node colors here
        node.select("circle")
            .attr("r", function (d) {
                if (d.bcnhighlight) {
                    return (settings.nodeSize * 1.5);
                }
                return settings.nodeSize;
            })
            .style("fill", function (d) {
                if (d[currentS]) {
                    if (d._children) {
                        return "red";
                    } else {
                        return colorScale(d[currentS])
                    }
                }
            });

        node.select("rect")
            .attr("width", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .attr("height", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return (settings.nodeSize * 2) + "px";
                } else {
                    return "0px";
                }
            })
            .style("fill", function (d) {
                if (d.clickedHighlight || d.bcnhighlight) {
                    return "red"; //changed from red, so that boxes look different when highlighted to when searched
                }
            })
            .attr("y", -settings.nodeSize + "px")
            .attr("x", -settings.nodeSize + "px");

        // Node changes with transition
        var nodeUpdate;
        if (treeToggle === true) {
            nodeUpdate = node.attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });
        } else {
            nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });
        }

        // Add text to nodes and leaves
        nodeUpdate.select("circle")
            .style("fill", function (d) {
                if (multiSelected[0] == d) {
                    return colorObj.color1;
                };
                if (multiSelected[1] == d) {
                    return colorObj.color2;
                };
                if(inChildren1(d) && inChildren2(d)){
                    return inBoth()
                }
                if (inChildren1(d)) {
                    return colorObj.color1;
                };
                if (inChildren2(d)) {
                    return colorObj.color2;
                };
            });

        nodeUpdate.select("text")
            .style("fill", function (d) {
                if (multiSelected[0] == d) {
                    return colorObj.color1;
                };
                if (multiSelected[1] == d) {
                    return colorObj.color2;
                };
                if(inChildren1(d) && inChildren2(d)){
                    return inBoth()
                }
                if (inChildren1(d)) {
                    return colorObj.color1;
                };
                if (inChildren2(d)) {
                    return colorObj.color2;
                };
            });

        nodeUpdate.select("text")
            .style("font-weight", function (d) {
                if (multiSelected[0] == d) {
                    return "bold";
                };
                if (multiSelected[1] == d) {
                    return "bold";
                };
                if (inChildren1(d)) {
                    return "bold";
                };
                if (inChildren2(d)) {
                    return "bold";
                };
            });


        //Hide node labels
        nodeUpdate.select("text")
            .style("visibility", function () {
                if (settings.hideLabels) {
                    return "hidden"
                }
                else {
                    return "visible"
                }
            })



        nodeUpdate.select("text")
            .style("fill-opacity", 1)

            .attr("x", function (d) {
                if ((!d.children || d._children) && treeName === trees[treeIdx].name && settings.mirrorRightTree) { //mirrored right tree
                    return -13 - getTextWidth(d.name);
                } else if (!d.children && !d._children) { //leaves left tree
                    return 13
                } else { //internal nodes
                    if (treeName === trees[treeIdx].name && settings.mirrorRightTree) { //internal nodes right tree
                        return 23
                    } else { //internal nodes left tree
                        return -13
                    }

                }
            })
            .text(function (d) {
                if (!d.children && !d._children) { //print leaf names
                    return d.name
                } else {
                    if (settings.internalLabels === "none") {
                        return "";
                    } else if (settings.internalLabels === "name") { //print bootstrap values
                        return d.branchSupport
                    } else if (settings.internalLabels === "color") { //print bootstrap values
                        return d.branchSupport
                    } else if (settings.internalLabels === "species") { //print species values
                        return d.species
                    } else if (settings.internalLabels === "taxonomyID") { //print taxonomy values
                        return d.taxonomy
                    } else if (settings.internalLabels === "ECNumber") { //print ec number values for this node
                        return d.ECNumber
                    } else if (settings.internalLabels === "length") {
                        if (d.length) {
                            return d.length.toFixed(3);
                        }

                    } else if (settings.internalLabels === "likelihood") {
                        if (d.likelihood) {
                            return d.likelihood.toFixed(3);
                        }
                    } else if (settings.internalLabels === "orthologous") {
                        if (d.orthologous) {
                            return d.orthologous;
                        }
                    } else if (settings.internalLabels === "superorthologous") {
                        if (d.superorthologous) {
                            return d.superorthologous;
                        }

                    } else if (settings.internalLabels === "subtree") {
                        if (d.subtree === 'Y') {
                            return 'Y';
                        } else {
                            return 'N';
                        }

                    } else if (settings.internalLabels === "collapseThis") {
                        if (d.collapseThis === 'Y') {
                            return 'Y';
                        } else {
                            return 'N';
                        }


                    } else if (settings.internalLabels === "duplication") {
                        if (d.duplication === 'Y') {
                            return 'duplication';
                        } else {
                            return 'speciation';
                        }

                    } else if (settings.internalLabels === "similarity" && d.similarity) {
                        return d.similarity;
                    }
                }
            });

        // Transition exiting nodes to the parent"s new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                if (source === treeData.root) {
                    var e = findHeighestCollapsed(d);
                    return "translate(" + e.y + "," + e.x + ")";
                } else {
                    return "translate(" + source.y + "," + source.x + ")";
                }
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6)
            .attr("stroke", "none");

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        nodeExit.select("path")
            .attr("d", function (d) {
                return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
            });

        nodeExit.select(".triangleText")
            .attr("x", 0)
            .each("end", function () {
                d3.select(this).text("")
            });

        //function important for collapsing
        node.each(function (d) {
            if (d._children) {

                var offset = leafHeight / triangleHeightDivisor * d.leaves.length / 2;
                var canvasWidth = document.getElementById(treeData.canvasId).scrollWidth;
                var xlength = d.triangleLength * (lengthMult / maxLength);
                var ylength = offset; //height of half of the triangle

                d3.select(this).select("path").transition().duration(duration) // (d.searchHighlight) ? 0 : duration)
                    .attr("d", function (d) {
                        if (treeName === trees[treeIdx].name && settings.mirrorRightTree) {
                            return "M" + 0 + "," + 0 + "L" + -xlength + "," + (-ylength) + "L" + -xlength + "," + (ylength) + "L" + 0 + "," + 0;
                        } else {
                            return "M" + 0 + "," + 0 + "L" + xlength + "," + (-ylength) + "L" + xlength + "," + (ylength) + "L" + 0 + "," + 0;
                        }
                    })
                    .style("fill", function (d) {
                        if(inChildren1(d) && inChildren2(d)){
                            return inBoth()
                        }
                        else if (inChildren1(d)) {
                            return colorObj.color1;
                        }
                        else if (inChildren2(d)) {
                            return colorObj.color2;
                        }
                        else if (d[currentS]) {
                            return colorScale(d[currentS]); // changes colour of the collapsed triangle shape
                        }

                    });
                d3.select(this).select(".triangleText").attr("font-size", function (d) {
                    return settings.fontSize + "px"
                });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .text(function (d) {
                        var text = d.leaves[0].name + " ... " + d.leaves[d.leaves.length - 1].name;
                        return text;
                    })
                    .attr("x", function (d) {
                        //var xpos = (avg - (getLength(d) * (lengthMult / maxLength))) + 5;
                        var text = d.leaves[0].name + " ... " + d.leaves[d.leaves.length - 1].name;
                        if (treeName === trees[treeIdx].name && settings.mirrorRightTree) {
                            var xpos = d.triangleLength * (lengthMult / maxLength) + 5;
                            if (xpos > canvasWidth) { // ensures that triangle doesn't go out of visible space
                                xpos = xlength + 5;
                            }
                            return -xpos - getTextWidth(text);
                        } else {
                            var xpos = d.triangleLength * (lengthMult / maxLength) + 5;
                            if (xpos > canvasWidth) { // ensures that triangle doesn't go out of visible space
                                xpos = xlength + 5;
                            }
                            return xpos;
                        }
                    })
                    .style("fill", function (d) {
                        if(inChildren1(d) && inChildren2(d)){
                            return inBoth()
                        }
                        else if (inChildren1(d)) {
                            return colorObj.color1;
                        }
                        else if (inChildren2(d)) {
                            return colorObj.color2;
                        }
                    })
                    .style("font-weight", function (d) {
                        if (inChildren1(d)) {
                            return "bold";
                        };
                        if (inChildren2(d)) {
                            return "bold";
                        };
                    })
                    .style("visibility", function () {
                        if (settings.hideLabels) {
                            return "hidden";
                        }
                        else {
                            return "visible";
                        }
                    });

            }
            if (d.children) {
                d3.select(this).select("path").transition().duration(duration)
                    .attr("d", function (d) {
                        return "M" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0 + "L" + 0 + "," + 0;
                    });
                d3.select(this).select(".triangleText").transition().duration(duration)
                    .attr("x", 0)
                    .each("end", function () {
                        d3.select(this).text("")
                    });
            }
        });


        /*
         Helper function for rendering lines
         Called twice, once for black bg lines, once for foreground coloured lines in comparison view
         */
        function renderLinks(type) {

            // Update the links…
            var select = (type === "bg") ? "linkbg" : "link";
            // return an array of all the DOM element of class path.front
            // which data is the list of IDs of each links
            var link = treeData.svg.selectAll("path." + select)
                // Links is the data array which each element is assigned a target ID key
                // Any element in the specified data array whose key is different
                // from keys of all the existing elements, becomes a part of the enter selection.
                // If the key of a new element matches the key of one of the existing elements
                // then it is NOT a part of the enter selection.
                .data(links, function (d) {
                    return d.target.id;
                })
                .attr("id", function (d) { //adds source.id of node
                    return d.source.ID + '_' + d.target.ID;
                })
                .style("stroke", function (d) {
                    var e = d.target;
                    var f = d.source;
                    if (f[currentS] && (settings.internalLabels === "none")) {
                        return colorScale(e[currentS])
                    } else if (e["branchSupport"] && (settings.internalLabels === "name")) { // color branch according to branch support
                        return colorScaleRest(parseFloat(e["branchSupport"]) / maxBranchSupport)
                    } else if (e["specifiedBranchColor"] && (settings.internalLabels === "color")) { // color branch according to prespecified rgb values in the nhx file
                        return rgb2hex(e["specifiedBranchColor"])
                    } else if(inChildren1(e) && inChildren2(e)){
                        return inBoth()
                    } else if (inChildren1(e)) {
                        return colorObj.color1;
                    } else if (inChildren2(e)) {
                        return colorObj.color2;
                    } else { // return the standard color
                        return "grey"
                    }
                });

            // Enter any new links at the parent"s previous position.
            // enter().insert will create as many elements as the number of elements in the enter selection
            // If the specified type is a string, inserts a new element of this type (tag name)
            // before the element matching the specified before selector for each selected element.
            // For example, a before selector :first-child will prepend nodes before the first child.
            link.enter().insert("path", "g")
                .attr("class", function (d) {
                    if (type === "bg") {
                        return "linkbg";
                    } else {
                        return "link";
                    }
                })
                .attr("id", function (d) { //adds source.id of node
                    return d.source.ID + '_' + d.target.ID;
                })
                .attr("d", function (d) {
                    d = d.source;
                    var output;
                    if (source === treeData.root) {
                        if (d.parent) { //draws the paths between nodes starting at root node
                            output = "M" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x + "L" + d.parent.y + "," + d.parent.x;
                        } else { //here when reroot is selected....
                            output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                        }
                    } else {
                        output = "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }
                    return output;
                })
                .style("stroke-width", function () {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .style("stroke", function (d) {
                    var e = d.target;
                    var f = d.source;
                    if (f[currentS] && (settings.internalLabels === "none")) {
                        return colorScale(f[currentS])
                    } else if (e["branchSupport"] && (settings.internalLabels === "name")) {
                        return colorScaleRest(parseFloat(e["branchSupport"]) / maxBranchSupport)
                    } else if (e["specifiedBranchColor"] && (settings.internalLabels === "color")) { // color branch according to prespecified rgb values in the nhx file
                        return rgb2hex(e["specifiedBranchColor"])
                    } else if(inChildren1(d) && inChildren2(d)){
                        return inBoth()
                    } else if (inChildren1(e)) {
                        return colorObj.color1;
                    } else if (inChildren2(e)) {
                        return colorObj.color2;
                    } else { // return the standard color
                        return "grey"
                    }
                })
                .style("fill", "none") //this line is important for the export function
                .on("click", treeData.clickEventLink);

            link.select("rect")
                .attr("width", function (d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .attr("height", function (d) {
                    if (d.clickedHighlight) {
                        return (settings.nodeSize * 2) + "px";
                    } else {
                        return "0px";
                    }
                })
                .style("fill", function (d) {
                    if (d.clickedHighlight) {
                        return d.clickedHighlight;
                    }
                })
                .attr("y", -settings.nodeSize + "px")
                .attr("x", -settings.nodeSize + "px");

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .style("stroke-width", function () {
                    if (type === "bg") {
                        return (parseInt(settings.lineThickness) + 2);
                    } else if (type === "front") {
                        return settings.lineThickness;
                    }
                })
                .attr("d", function (d) {
                    return "M" + d.source.y + "," + d.source.x + "L" + d.source.y + "," + d.target.x + "L" + d.target.y + "," + d.target.x;
                });

            // Transition exiting nodes to the parent"s new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function (d) {
                    d = d.source;
                    if (source === treeData.root) {
                        var e = findHeighestCollapsed(d);
                        return "M" + e.y + "," + e.x + "L" + e.y + "," + e.x + "L" + e.y + "," + e.x;
                    } else {
                        return "M" + source.y + "," + source.x + "L" + source.y + "," + source.x + "L" + source.y + "," + source.x;
                    }
                })
                .remove();

        }

        renderLinks("front");

        // stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        //calculate the new scale text
        if (settings.enableScale) {
            applyScaleText(treeData.scaleText, treeData.zoomBehaviour.scale(), treeData.root);
        }

        //event listeners for nodes to handle mouseover highlighting, important because all children nodes have to be highlighted
        //input d is currently selected node....
        function nodeMouseover(d) {
            //function to color subtree downstream of a selected node in green
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        d3.select("#" + n.ID + "_" + n.children[i].ID).classed("select", true);
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) { //as long as fishEyeZoom is turned off
                    d3.select("g").select("#" + n.ID).classed("select", true);
                    d3.select("#" + n.ID).select("text").classed("select", true);
                    d3.select("#" + n.ID).select("circle").classed("select", true);
                    d3.select("#" + n.ID).select("path").classed("select", true);
                    d3.select("#" + n.ID).select(".triangleText").classed("select", true);
                    d3.select("#" + n.ID).select(".triangle").classed("select", true);
                }
            }

            colorLinkNodeOver(d);
        }

        function nodeMouseout(d) {
            function colorLinkNodeOver(n) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        d3.select("#" + n.ID + "_" + n.children[i].ID).classed("select", false);
                        colorLinkNodeOver(n.children[i]);
                    }
                }
                if (!settings.enableFisheyeZoom) {
                    d3.select("g").select("#" + n.ID).classed("select", false);
                    d3.select("#" + n.ID).select("text").classed("select", false);
                    d3.select("#" + n.ID).select("circle").classed("select", false);
                    d3.select("#" + n.ID).select("path").classed("select", false);
                    d3.select("#" + n.ID).select(".triangleText").classed("select", false);
                    d3.select("#" + n.ID).select(".triangle").classed("select", false);
                }
            }

            colorLinkNodeOver(d);
        }




        // this part ensures that when clicking on a node or elsewhere in the screen the tooltip disappears
        $('html').click(function (d) {
            if (compareMode) {
                if ((d.target.getAttribute("class") !== "link" && d.target.getAttribute("class") !== "node" && d.target.getAttribute("class") !== "linkbg" && d.target.getAttribute("class") !== "link search" && d.target.getAttribute("class") !== "node select")) {
                    $(".tooltipElem").remove()
                }
            } else {
                if ((d.target.getAttribute("class") !== "link" && d.target.getAttribute("class") !== "node" && d.target.getAttribute("class") !== "link search" && d.target.getAttribute("class") !== "node select")) {
                    $(".tooltipElem").remove()
                }
            }
        });
    }

    /*
     Hook up the zoom slider on the vis to zoomEvent
     */
    function applyEventListeners(treeData) {
        $("#zoomSlider" + treeData.id).on("input change", function () {
            treeData.zoomBehaviour.scale($("#zoomSlider" + treeData.id).val());
            treeData.zoomBehaviour.event(treeData.svg);
        });
    }

    /*
     Functions for handling actions of tree spacing controls
     */
    function sizeHorizontal(treeData, increase) {
        if (increase) {
            treeData.treeWidth = parseInt(treeData.treeWidth) + 40;
            treeData.treeWidth = (treeData.treeWidth > 5) ? treeData.treeWidth : 5;

        } else {
            treeData.treeWidth = parseInt(treeData.treeWidth) - 40;
            treeData.treeWidth = (treeData.treeWidth > 5) ? treeData.treeWidth : 5;

        }
    }

    function sizeVertical(treeData, increase) {
        if (increase) {
            treeData.treeHeight = parseInt(treeData.treeHeight) + 1;
            treeData.treeHeight = (treeData.treeHeight > 1) ? treeData.treeHeight : 1;
        } else {
            treeData.treeHeight = parseInt(treeData.treeHeight) - 1;
            treeData.treeHeight = (treeData.treeHeight > 1) ? treeData.treeHeight : 1;
        }
    }


    /*
     Find the heighest collapsed node in the parents of a node
     */
    function findHeighestCollapsed(d) {
        if (d.parent) {
            if (d._children && d.parent.children) {
                return d;
            } else {
                return (findHeighestCollapsed(d.parent));
            }
        } else {
            return d;
        }
    }

    function createUndoButton(canvasId) {

        function buildUndoButton(canvasId) {
            var undo = d3.select("#" + canvasId).append("div")
                .attr("class", "undo");

            undo.append("a")
                .attr("class", "btn btn-sm sharp undoButton")
                .attr("title", "undo last tree manipulation")
                .attr("id", "undobtn" + canvasId)
                .attr("data-count", 0)
                .append("span")
                .attr("class", "fa fa-undo")
                .attr("aria-hidden", "true");
        }

        buildUndoButton(canvasId);

        undo(canvasId, "undobtn" + canvasId);
    }


    function createSharing(canvasId, downloadClass) {

        function buildShareButton(canvasId, downloadClass) {
            var shareTools = d3.select("#" + canvasId).select("." + downloadClass).append("div")
                .attr("class", "share");

            shareTools.append("button")
                .attr("id", "shareButton")
                .attr("class", "btn btn-sm sharp share")
                .attr("title", "share tree as gist in the cloud")
                .attr("type", "button")
                .append("span")
                .attr("class", "fas fa-cloud-upload-alt")
            /*.attr("aria-hidden","true");*/

        }

        buildShareButton(canvasId, downloadClass);

        $("#shareButton, #cloudShare").click(function (e) {
            var mode = $("#mode-buttons .active").attr('id');
            if (mode === "compare-btn") {
                try {
                    var exportURLGist = treecomp.exportTreeToGist(true);
                    if (exportURLGist.toLowerCase().indexOf("error") !== -1) {
                        throw (exportURLGist)
                    }
                    $('#modalBody').empty();
                    $('#modalBody').append("<a href='" + exportURLGist + "'>" + exportURLGist + "</a>");
                } catch (e) {
                    $('#modalTitleError').html('Error!');
                    $('#modalBodyError').empty();
                    $('#modalBodyError').html(e);
                    $('#myErrorModal').modal('show');
                    return false;

                }
            } else if (mode === "view-btn") {
                try {
                    var exportURLGist = treecomp.exportTreeToGist(false);

                    if (exportURLGist.indexOf("ERROR") !== -1) {

                        throw (exportURLGist)
                    }
                    $('#modalBody').empty();
                    $('#modalBody').append("<a href='" + exportURLGist + "'>" + exportURLGist + "</a>");
                } catch (e) {
                    $('#modalTitleError').html(e);
                    $('#modalBodyError').empty();
                    $('#modalBodyError').html(e);
                    $('#myErrorModal').modal('show');
                    return false;
                }
            }

            $('#myModal').modal('show');

        });
    }

    function createExportBar(canvasId, baseTree, compareMode) {

        function buildExportBar(canvasId) {
            var exportTools = d3.select("#" + canvasId).append("div")
                .attr("class", "exportTools");

            exportTools.append("a")
                .attr("class", "btn btn-sm sharp exportButton")
                .attr("title", "export or share tree visualization")
                .append("span")
                .attr("class", "fa fa-download")
                .attr("aria-hidden", "true");

            var exportMenu = d3.select("#" + canvasId).append("div")
                .attr("class", "exportMenu");
            // .append("ul")
            // .attr("class", "treeToolsMenuContent");
            if (settings.enableDownloadButtons) {
                exportMenu.append("li")
                    .attr("class", "exportText")
                    .append("div")
                    .attr("class", "export")
                    .text("Export");
            }

            if (settings.enableCloudShare) {
                exportMenu.append("li")
                    .attr("class", "exportText")
                    .append("div")
                    .attr("class", "share")
                    .text("Share");
            }
        }
        buildExportBar(canvasId);

        if (settings.enableDownloadButtons) {
            createTreeDownload(canvasId, "export");
        }

        if (settings.enableCloudShare) {
            createSharing(canvasId, "share");
        }

        d3.select("#" + canvasId).select(".exportButton")
            .on("click", function () {
                $("#" + canvasId + " .exportButton").toggleClass("opacity");
                $("#" + canvasId + " .exportMenu").slideToggle(200);
                if (d3.select("#" + canvasId + " .treeToolsMenu").style("display") !== "none") {
                    $("#" + canvasId + " .treeToolsButton").toggleClass("opacity");
                    $("#" + canvasId + " .treeToolsMenu").slideToggle(200);

                }
            });
    }

    function createToolbar(canvasId, baseTree, compareMode) {

        function buildToolbar(canvasId) {
            var treeTools = d3.select("#" + canvasId).append("div")
                .attr("class", "treeTools");

            treeTools.append("a")
                .attr("class", "btn btn-sm sharp treeToolsButton")
                .attr("title", "tools for tree manipulation")
                .append("span")
                .attr("class", "fa fa-wrench")
                .attr("aria-hidden", "true");

            var treeToolsMenu = d3.select("#" + canvasId).append("div")
                .attr("class", "treeToolsMenu");
            // .append("ul")
            // .attr("class", "treeToolsMenuContent");

            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "rescale")
                .text("Rescale");

            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "zoom")
                .text("Zoom");


            treeToolsMenu.append("li")
                .attr("class", "treeToolsText")
                .append("div")
                .attr("class", "ladderize")
                .text("Ladderize");


            if (compareMode) {
                treeToolsMenu.append("li")
                    .attr("class", "treeToolsText")
                    .append("div")
                    .attr("class", "oppositeTreeAction")
                    .text("Equalize trees");
            }
        }

        buildToolbar(canvasId);

        if (settings.enableSizeControls) {
            createTreeRescale(canvasId, "rescale", baseTree);
        }

        if (settings.enableZoomSliders) {
            createZoomSlider(canvasId, "zoom", baseTree);
        }

        if (settings.enableLadderizeTreeButton) {
            createLadderizedTree(canvasId, "ladderize", baseTree);
        }


        if (settings.enableOppositeTreeActions && compareMode) {
            createOppositeTreeActions(canvasId, "oppositeTreeAction");
        }

        d3.select("#" + canvasId).select(".treeToolsButton")
            .on("click", function () {
                $("#" + canvasId + " .treeToolsButton").toggleClass("opacity");
                $("#" + canvasId + " .treeToolsMenu").slideToggle(200);
                if (d3.select("#" + canvasId + " .exportMenu").style("display") !== "none") {
                    $("#" + canvasId + " .exportButton").toggleClass("opacity");
                    $("#" + canvasId + " .exportMenu").slideToggle(200);

                }

            });
    }

    function createOppositeTreeActions(canvasId, oppositeTreeActionsClass) {
        /*---------------
         /
         /  Function to find best corresponding root in opposite tree and automatically perform rerooting on that root
         /      works only in "compare mode" and needs the canvasId to know which tree will
         /      be manipulated
         /
         ---------------*/
        function findBestCorrespondingTree(canvasId) {
            var isCompared = true;
            var canvasLeft = "vis-container1";
            var canvasRight = "vis-container2";
            var tree;
            var fixedTree;

            if (canvasId === canvasLeft) { //ensures that the right tree is fixed
                tree = getTreeFromCanvasId(canvasLeft);
                fixedTree = getTreeFromCanvasId(canvasRight);
            } else {
                tree = getTreeFromCanvasId(canvasRight);
                fixedTree = getTreeFromCanvasId(canvasLeft);
            }

            settings.loadingCallback();
            setTimeout(function () {
                //------
                //
                // Main part: reroot at the node that is most similar to fixed tree root
                //
                //------
                var rerootedTree;
                if (fixedTree.root.children[0].elementBCN.parent) {
                    expandPathToNode(fixedTree.root.children[0].elementBCN);
                    rerootedTree = reroot(tree, fixedTree.root.children[0].elementBCN);
                }

                if (isCompared) {
                    var index1 = findTreeIndex(tree.name);
                    var index2 = findTreeIndex(fixedTree.name);
                    preprocessTrees(trees[index1], trees[index2]);
                    //settings.loadedCallback();

                    if (rerootedTree !== undefined) {
                        update(tree.root, rerootedTree.data);
                    }
                    update(fixedTree.root, fixedTree.data);
                }
            }, 2);
        };

        /*---------------
         /
         /  Function to swap on nodes to optimize the visualisation between two trees
         /      works only in "compare mode" and needs the canvasId to know which tree will
         /      be manipulated
         /
         ---------------*/
        function findBestCorrespondingLeafOrder(canvasId) {

            var canvasLeft = "vis-container1";
            var canvasRight = "vis-container2";
            var tree;
            var fixedTree;

            if (canvasId === canvasLeft) { //ensures that the right tree is fixed
                tree = getTreeFromCanvasId(canvasLeft);
                fixedTree = getTreeFromCanvasId(canvasRight);
            } else {
                tree = getTreeFromCanvasId(canvasRight);
                fixedTree = getTreeFromCanvasId(canvasLeft);
            }

            //------
            // SWAP branches at a specific node
            // input: node d with its children
            //------
            function rotate(d) {
                var first;
                var second;
                if (d.children) {
                    first = d.children[0];
                    second = d.children[1];
                    d.children[0] = second;
                    d.children[1] = first;
                } else if (d._children) {
                    first = d._children[0];
                    second = d._children[1];
                    d._children[0] = second;
                    d._children[1] = first;
                }

            }

            //------
            // GET the leafnames part of a specific node d
            // input: node d with its children
            //------
            function getChildLeafNames(d) {
                var leafNames = [];
                var leaves = getChildLeaves(d);
                for (var i = 0; i < leaves.length; i++) {
                    leafNames.push(leaves[i].name);
                }
                return leafNames;
            }

            //------
            // GET the corresponding node based on best overlap of leaves between two trees
            // input: treeLeaves (getChildLeafNames) and ifixedTree the fixed tree as input
            //------
            function getCorrespondingNode(treeLeaves, ifixedTree) {

                var bestCorrespondingFixTreeLeaves = "";
                var bestCount = 0;
                postorderTraverse(ifixedTree.root, function (d) {
                    if (d.children || d._children) {
                        var fixedTreeLeaves = getChildLeafNames(d);
                        var count = 0;

                        for (var i = 0; i < fixedTreeLeaves.length; i++) {
                            if (treeLeaves.indexOf(fixedTreeLeaves[i]) !== -1) {
                                count += 1;
                            }
                        }

                        if (count > bestCount) {
                            bestCorrespondingFixTreeLeaves = fixedTreeLeaves;
                            bestCount = count;
                        }
                    }
                }, true);

                return bestCorrespondingFixTreeLeaves;
            }

            //------
            //
            // Main part: traverses all nodes of tree and if different leaf order in fixedTree calls the rotate function
            //
            //------
            postorderTraverse(tree.root, function (d) {

                if (d.children || d._children) {
                    var leaves = getChildLeafNames(d);
                    var fixedLeaves = getCorrespondingNode(leaves, fixedTree);
                    if (leaves[0] !== fixedLeaves[0] && leaves[leaves.length - 1] !== fixedLeaves[fixedLeaves.length - 1]) {
                        rotate(d);
                    }
                }
            }, true);

            update(tree.root, tree.data);
            settings.loadedCallback();
        }

        function buildOppositeTreeActionsButtons(canvasId, oppositeTreeActionsClass) {
            var oppositeTreeActionButton = d3.select("#" + canvasId).select("." + oppositeTreeActionsClass).append("div")
                .attr("class", "btn-group opTreeAc-group");
            oppositeTreeActionButton.append("button")
                .attr("id", "opTreeAcButton")
                .attr("class", "btn btn-sm sharp opTreeAcButtonReroot")
                .attr("title", "reroot according to opposite tree")
                .attr("type", "button")
                .append("span")
                .text("reroot");
            oppositeTreeActionButton.append("button")
                .attr("id", "opTreeAcButton")
                .attr("class", "btn btn-sm sharp opTreeAcButtonReorder")
                .attr("title", "reorder according to opposite tree")
                .attr("type", "button")
                .append("span")
                .text("reorder");
        }

        /*----------------------
         |
         | Renders middle buttons in compare mode for rerooting and resorting
         |
         ----------------------*/

        // draws buttons to swap one tree and not the other
        if (settings.enableFixedButtons) {
            buildOppositeTreeActionsButtons(canvasId, oppositeTreeActionsClass);
        }


        d3.select("#" + canvasId).select(".opTreeAcButtonReroot")
            .on("click", function () {
                settings.loadingCallback();
                setTimeout(function () {
                    findBestCorrespondingTree(canvasId);
                }, 2);
            });

        d3.select("#" + canvasId).select(".opTreeAcButtonReorder")
            .on("click", function () {
                settings.loadingCallback();
                setTimeout(function () {
                    findBestCorrespondingLeafOrder(canvasId);
                }, 2);
            });

    }

    function createLeafSearch(canvasId, name) {

        var baseTree = trees[findTreeIndex(name)];

        /*
         Helper function allows to search even partial strings
         */
        function stringSearch(string, start) {
            var does = true;
            var n;
            if (start !== "") {
                n = string.search(start);
            } else {
                n = -1;
            }
            if (n === -1) {
                does = false;
            }
            return does;
        }

        function buildSearchBox(canvasId) {
            var searchDiv = d3.select("#" + canvasId).append("div")
                .attr("class", "searchBox");

            var searchDivA = searchDiv.append("a")
                .attr("class", "btn btn-sm sharp searchButton")
                .attr("title", "search by leaf name");

            searchDivA.append("span")
                .attr("class", "glyphicon glyphicon-search")
                .attr("aria-hidden", "true");

            searchDiv.append("input")
                .attr("class", "searchInput")
                .attr("type", "text")
                .attr("placeholder", "search")
                .attr("autofocus");

            var searchBox = d3.select("#" + canvasId).select(".searchBox").append("div")
                .attr("class", "searchResultsBox")
                .append("ul")
                .attr("class", "searchResultsList");

        }


        function displaySearchResults(results, canvasId, baseTree) {
            for (var i = 0; i < results.length; i++) {
                var resultsList = d3.select("#" + canvasId).select(".searchResultsList");
                resultsList.append("li")
                    .append("a")
                    .attr("class", i)
                    .attr("id", results[i].name)
                    .attr("href", "#")
                    .text(results[i].name);

                var indices = [];
                // click on a leaf from the list and highlight only its path
                d3.select("#" + canvasId).select("#" + results[i].name).on("click", function () {
                    var index = $(this).attr("class");
                    //var index = i;
                    indices.push(parseInt(index));

                    var j;

                    for (j = 0; j < results.length; j++) {
                        if (indices.indexOf(j) < 0) {
                            expandPathToLeaf(results[j], true, false);
                        }
                    }
                    if (settings.selectMultipleSearch) { // allows to select multiple entries containing the same letter
                        for (j = 0; j < indices.length; j++) {
                            expandPathToLeaf(results[indices[j]], false);
                        }
                    } else {
                        for (j = 0; j < indices.length - 1; j++) { // allows only to select one entry
                            expandPathToLeaf(results[indices[j]], true, false);
                        }
                        expandPathToLeaf(results[indices[indices.length - 1]], false, true); // uncollapse the tree and set ids to paths
                        update(baseTree, baseTree.data);
                        expandPathToLeaf(results[indices[indices.length - 1]], false, true); // set clicked link to class link search
                    }
                    update(baseTree, baseTree.data);
                    if (settings.moveOnClick) { // this part is responsible to move the opposite highlighted node to the center
                        var currentScale = baseTree.data.zoomBehaviour.scale();
                        var y = (-results[indices[j]].y + ($("#" + baseTree.data.canvasId).width() / 2) / currentScale);
                        var x = (-results[indices[j]].x + ($("#" + baseTree.data.canvasId).height() / 2) / currentScale);
                        baseTree.data.zoomBehaviour.translate([y, x]);
                        d3.select("#" + baseTree.data.canvasId + " svg g")
                            .transition(1500)
                            .attr("transform", "scale(" + currentScale + ")" + "translate(" + baseTree.data.zoomBehaviour.translate() + ")");
                    }

                });
            }
        }

        function showSearchBar(canvasId) {
            d3.select("#" + canvasId).select(".searchInput")
                .style("display", "inline")
                .transition().duration(600)
                .style("width", "150px").node().focus();

        }

        function hideSearchBar(canvasId) {
            d3.select("#" + canvasId).select(".searchResultsList")
                .empty();

            d3.select("#" + canvasId).select(".searchResultsBox")
                .transition().duration(600)
                .style("display", "none");

            d3.select("#" + canvasId).select(".searchInput")
                .transition().duration(600)
                .style("width", "0px")
                .style("display", "none");

            $("#" + canvasId + " .searchInput").val("");
        }

        buildSearchBox(canvasId);

        d3.select("#" + canvasId).select(".searchButton").on("click", function () {
            var searchInput = $("#" + canvasId + ' .searchInput');
            if (searchInput.is(":visible")) {

                postorderTraverse(baseTree.data.root, function (d) { // ensures that highlighted search is removed when button of search is inactive
                    if (d.parent) {
                        d3.select("#" + d.parent.ID + "_" + d.ID).classed("search", false);
                        d3.select("#" + d.ID).select("circle").classed("search", false);
                        d3.select("#" + d.ID).select("text").classed("search", false);
                    }
                });
                update(baseTree.root, baseTree.data);

                hideSearchBar(canvasId);

            } else { //if search unselected then remove orange highlight from branches
                showSearchBar(canvasId);
            }
        });

        // variable i is set to the number of leaves
        var leafObjs = [];
        for (var i = 0; i < baseTree.root.leaves.length; i++) {
            leafObjs.push(baseTree.root.leaves[i]);
        }


        //main event handler, performs search every time a char is typed so can get realtime results
        $("#" + canvasId + " .searchInput").bind("paste keyup", function () {
            $("#" + canvasId + " .searchResultsList").empty();
            var text = $(this).val();

            // results is a list of leaves
            // which name matches the key(s) pressed
            // (auto-completion)
            var results = _.filter(leafObjs, function (leaf) {
                return stringSearch(leaf.name.toLowerCase(), text.toLowerCase());
            });

            var results_name = [];
            var i;
            for (i = 0; i < results.length; i++) {
                results_name.push(results[i].name)
            }
            postorderTraverse(baseTree.data.root, function (d) {
                expandPathToLeaf(d, true, false);
            });
            update(baseTree.root, baseTree.data);

            if (typeof results_name !== "undefined" && results_name !== null && results_name.length > 0) {
                $("#" + canvasId + " .searchResultsBox").slideDown(200);
                $("#" + canvasId + " .searchResultsList").empty();

                postorderTraverse(baseTree.data.root, function (d) {
                    if (results_name.indexOf(d.name) > -1) {
                        expandPathToLeaf(d, false, false);
                    }
                });
                update(baseTree.root, baseTree.data);

                displaySearchResults(results, canvasId, baseTree);
            }
            else {
                $("#" + canvasId + " .searchResultsList").empty();
                $("#" + canvasId + " .searchResultsBox").slideUp(200, function () {
                    $("#" + canvasId + " .searchResultsBox").css({
                        "display": "none"
                    });
                });
            }
        });

        // ensures that searchbar is removed when clicking on canvas
        $(document).click(function (event) {
            if (!$(event.target).closest('.searchBox').length && $('.searchInput').is(":visible")) {
                postorderTraverse(baseTree.data.root, function (d) { // ensures that highlighted search is removed when button of search is inactivepyen
                    if (d.parent) {
                        d3.select("#" + d.parent.ID + "_" + d.ID).classed("search", false)
                        d3.select("#" + d.ID).select("circle").classed("search", false);
                        d3.select("#" + d.ID).select("text").classed("search", false);
                    }
                });

                hideSearchBar(canvasId);
            }
        });
    }

    function createTreeToggle(name, canvas, scale, oppositeCanvas, oppositeScale) {
        /*----------------------
         |
         | Function that renders the drop down menu once multiple trees are loaded
         |
         ----------------------*/
        function renderTreeToggleDropDown(name, canvas, scale, oppositeCanvas, oppositeScale) {
            var index = findTreeIndex(name);
            var numTrees = trees[index].total;
            var indexStartTree = index;
            var indexLastTree = trees[index].last;


            var treeToggleDropDown = d3.select("#" + canvas + " .treeToggleButtons").append("div")
                .attr("class", "treeToggleDropdown");

            var treeToggleButtons = treeToggleDropDown.append("button")
                .attr("id", "treeToggleDropdownButton")
                .attr("class", "btn btn-sm sharp treeToggleDropdown-toggle")
                .attr("title", "toggle trees dropdown")
                .on('click', function () {
                    $("#dropDownList" + canvas).toggle();
                });

            ///span element is added in order to easier display and place the tree numbers on the dropDown menu
            var dropdownToggleButtonText = treeToggleButtons.append("span")
                .attr("id", "treeToggleDropdownText")
                .attr("class", "text-center")
                .text("1/" + (numTrees));

            var treeToggleOptions = treeToggleDropDown.append("div")
                .attr("class", "treeToggleDropdown-content")
                .attr("id", "dropDownList" + canvas)
                .append("ul").attr("class", "list-unstyled");

            for (var i = indexStartTree; i <= indexLastTree; i++) {
                treeToggleOptions.append("li").append("a")
                    .attr("id", canvas + "_tree_" + i)
                    .text(trees[i].part + 1)
                    .on('click', function () {
                        var splitId = d3.select(this).attr("id").split("_");
                        var ind = parseInt(splitId[splitId.length - 1]);
                        dropDownAction(ind)
                    });
            }

            function dropDownAction(ind) {
                d3.select("#" + canvas + " svg").remove();
                var toggledTree = trees[ind];
                var newName = toggledTree.name;
                //renderedTrees= [];
                if (oppositeCanvas !== undefined) { // compare mode
                    var oppositeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    var index2 = findTreeIndex(oppositeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    // render tress (workers) -> once done, run comprison (workers)
                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, newName, canvas, scale, oppositeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeName, oppositeCanvas, oppositeScale, newName, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);

                } else { // view mode
                    settings.loadingCallback();
                    setTimeout(function () {

                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        renderTree(toggledTree, newName, canvas, scale, undefined, true);

                        settings.loadedCallback();
                    }, 2);
                }
                var toggleStart = toggledTree.part + 1;
                dropdownToggleButtonText.text(toggleStart + "/" + numTrees);
            }

            // ensures that searchbar is removed when clicking on canvas
            $(document).click(function (event) {
                if (!$(event.target).closest('.treeToggleDropdown').length && $('.treeToggleDropdown-content').is(":visible")) {
                    $("#dropDownList" + canvas).hide()
                }
            });

        }


        /*----------------------
         |
         | Function that renders tree toggle buttons allows to have multiple trees to be loaded
         |
         ----------------------*/
        function renderTreeToggleButtons(canvas, scale, oppositeCanvas, oppositeScale) {

            var treeToggleButtons = d3.select("#" + canvas).append("div")
                .attr("class", "treeToggleButtons");

            treeToggleButtons.append("button")
                .attr("type", "button")
                .attr("class", "btn btn-sm sharp treeToggleButton")
                .attr("id", "leftToggleButton")
                .attr("title", "toggle trees to the left")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-left")
                .attr("aria-hidden", "true");

            treeToggleButtons.append("button")
                .attr("type", "button")
                .attr("class", "btn btn-sm sharp treeToggleButton")
                .attr("id", "rightToggleButton")
                .attr("title", "toggle trees to the right")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-right")
                .attr("aria-hidden", "true");


            function actionLeft(oldName, oppositeTreeName) {
                var index1 = findTreeIndex(oldName);
                var num_trees = trees[index1].last;
                trees[index1].display = false;
                if (trees[index1].part === 0) {
                    var toggledTree = trees[num_trees];
                } else {
                    var toggledTree = trees[index1 - 1];
                }
                toggledTree.display = true;
                var new_name = toggledTree.name;
                //renderedTrees= [];

                if (oppositeTreeName !== undefined) { // compare mode
                    var index2 = findTreeIndex(oppositeTreeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    // render tress (workers) -> once done, run comprison (workers)
                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, new_name, canvas, scale, oppositeTreeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeTreeName, oppositeCanvas, oppositeScale, new_name, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                } else { // view mode
                    settings.loadingCallback();
                    setTimeout(function () {
                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        renderTree(toggledTree, new_name, canvas, scale, undefined, true);
                        settings.loadedCallback();
                    }, 2);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                }


            }

            function actionRight(oldName, oppositeTreeName) {
                var index1 = findTreeIndex(oldName);
                var sub_index = trees[index1].part;
                var num_trees = trees[index1].last;
                trees[index1].display = false;

                // main function to assure cycling when toggle action is called
                if (index1 === (num_trees)) {
                    var toggledTree = trees[num_trees - sub_index];
                } else {
                    var toggledTree = trees[index1 + 1];
                }

                toggledTree.display = true;
                var new_name = toggledTree.name;
                //renderedTrees= [];
                if (oppositeTreeName !== undefined) {
                    var index2 = findTreeIndex(oppositeTreeName);
                    var oppositeTree = trees[index2];
                    initialiseTree(toggledTree.root, settings.autoCollapse);
                    initialiseTree(oppositeTree.root, settings.autoCollapse);

                    toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, true, oppositeTree);
                    toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, true, oppositeTree);
                    renderTree(toggledTree, new_name, canvas, scale, oppositeTreeName, true);

                    oppositeTree.data.clickEvent = getClickEventListenerNode(oppositeTree, true, toggledTree);
                    oppositeTree.data.clickEventLink = getClickEventListenerLink(oppositeTree, true, toggledTree);
                    renderTree(oppositeTree, oppositeTreeName, oppositeCanvas, oppositeScale, new_name, true);

                    settings.loadingCallback();
                    setTimeout(function () {
                        preprocessTrees(toggledTree, oppositeTree);
                    }, 5);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                } else {
                    settings.loadingCallback();
                    setTimeout(function () {

                        initialiseTree(toggledTree.root, settings.autoCollapse);
                        toggledTree.data.clickEvent = getClickEventListenerNode(toggledTree, false, {});
                        toggledTree.data.clickEventLink = getClickEventListenerLink(toggledTree, false, {});
                        //clear the canvas of any previous visualisation
                        renderTree(toggledTree, new_name, canvas, scale, undefined, true);
                        settings.loadedCallback();
                    }, 2);
                    var toggleStart = toggledTree.part + 1;
                    var toggleEnd = toggledTree.total;
                    d3.select("#" + canvas + " #treeToggleDropdownText").text(toggleStart + "/" + toggleEnd);
                }


            }

            var timeoutIdleft = 0;
            $("#" + canvas + " #leftToggleButton").mousedown(function () {
                var oldName = d3.select("#" + canvas + " svg").attr("id"); // get the old name of the tree as assigned by the render tree function
                d3.select("#" + canvas + " svg").remove();

                if (oppositeCanvas !== undefined) { // compare mode
                    var oppositeTreeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    actionLeft(oldName, oppositeTreeName);
                } else { // view mode
                    actionLeft(oldName);
                }

                timeoutIdleft = setInterval(actionLeft, 150);
            }).bind('mouseup mouseleave', function () {
                clearTimeout(timeoutIdleft);
            });

            var timeoutIdRight = 0;
            $("#" + canvas + " #rightToggleButton").mousedown(function () {
                var oldName = d3.select("#" + canvas + " svg").attr("id"); // get the old name of the tree as assigned by the render tree function
                d3.select("#" + canvas + " svg").remove();

                if (oppositeCanvas !== undefined) { // compare mode
                    var oppositeTreeName = d3.select("#" + oppositeCanvas + " svg").attr("id");
                    d3.select("#" + oppositeCanvas + " svg").remove();
                    actionRight(oldName, oppositeTreeName);
                } else { // view mode
                    actionRight(oldName);
                }

                timeoutIdRight = setInterval(actionRight, 150);
            }).bind('mouseup mouseleave', function () {
                clearTimeout(timeoutIdRight);
            });
        }

        renderTreeToggleButtons(canvas, scale, oppositeCanvas, oppositeScale);
        renderTreeToggleDropDown(name, canvas, scale, oppositeCanvas, oppositeScale);

    }

    function createTreeRescale(canvasId, rescaleClass, baseTree) {

        function buildRescaleButtons(canvasId) {

            var rescaleDiv = d3.select("#" + canvasId).select("." + rescaleClass).append("div")
                .attr("class", "rescaleButtons");

            //up button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "upButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-up")
                .attr("aria-hidden", "true");

            //left button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "leftButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-left")
                .attr("aria-hidden", "true");

            //right button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "rightButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-right")
                .attr("aria-hidden", "true");

            //down button
            rescaleDiv.append("button")
                .attr("class", "btn btn-sm sharp rescaleButton")
                .attr("id", "downButton")
                .append("span")
                .attr("class", "glyphicon glyphicon-arrow-down")
                .attr("aria-hidden", "true");
        }


        buildRescaleButtons(canvasId);
        //buildRescaleButtonsStyle(canvasId);

        // set up function for buttons on left top corner
        function actionUp() {
            sizeVertical(baseTree.data, false);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionDown() {
            sizeVertical(baseTree.data, true);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionLeft() {
            sizeHorizontal(baseTree.data, false);
            update(baseTree.root, baseTree.data, 0);
        }

        function actionRight() {
            sizeHorizontal(baseTree.data, true);
            update(baseTree.root, baseTree.data, 0);
        }

        var timeoutIdUp = 0;
        $("#" + canvasId + " #upButton").mousedown(function () {
            actionUp();
            timeoutIdUp = setInterval(actionUp, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdUp);
        });

        var timeoutIddown = 0;
        $("#" + canvasId + " #downButton").mousedown(function () {
            actionDown();
            timeoutIddown = setInterval(actionDown, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIddown);
        });

        var timeoutIdleft = 0;
        $("#" + canvasId + " #leftButton").mousedown(function () {
            actionLeft();
            timeoutIdleft = setInterval(actionLeft, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdleft);
        });

        var timeoutIdRight = 0;
        $("#" + canvasId + " #rightButton").mousedown(function () {
            actionRight();
            timeoutIdRight = setInterval(actionRight, 150);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(timeoutIdRight);
        });
    }

    function addLogo(svg) {
        // TODO load with ajax
        var logo_xml = '<svg id="exportLogo" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 107.35 22.23"><defs><style type="text/css">.st0{fill:#808285;}.st1{font-family:"MyriadPro-Regular";}.st2{font-size:21.1195px;}.st3{fill:none;stroke:#214554;stroke-width:1.2872;stroke-linecap:round;stroke-miterlimit:10;}.st4{fill:none;stroke:#602519;stroke-width:1.2872;stroke-linecap:round;stroke-miterlimit:10;}.st5{fill:none;stroke:#808285;stroke-width:1.2872;stroke-linecap:round;stroke-miterlimit:10;}.st6{fill:#602519;}.st7{font-size:6.9668px;}</style></defs><title>logo_export</title><text transform="matrix(1 0 0 1 25.1351 17.0859)" class="st0 st1 st2">phylostat</text><line class="st3" x1="1.9" y1="6.4" x2="1.8" y2="16.3"/><line class="st4" x1="2" y1="6.3" x2="9.2" y2="6.4"/><line class="st4" x1="9.3" y1="3.8" x2="9.3" y2="8.8"/><line class="st4" x1="12.5" y1="3.9" x2="9.7" y2="3.8"/><line class="st4" x1="14.3" y1="8.8" x2="9.6" y2="8.8"/><line class="st4" x1="2" y1="6.3" x2="9.2" y2="6.4"/><line class="st4" x1="9.3" y1="3.8" x2="9.3" y2="8.8"/><line class="st4" x1="15.8" y1="3.9" x2="9.7" y2="3.8"/><line class="st3" x1="1.9" y1="16.6" x2="5.4" y2="16.6"/><line class="st3" x1="5.7" y1="14.1" x2="5.7" y2="19.1"/><line class="st3" x1="8.8" y1="14.1" x2="6" y2="14.1"/><line class="st3" x1="8.8" y1="19" x2="6" y2="19"/><line class="st3" x1="1.9" y1="16.6" x2="5.3" y2="16.6"/><line class="st3" x1="5.7" y1="14.1" x2="5.7" y2="19.1"/><line class="st3" x1="8.8" y1="14.1" x2="6" y2="14.1"/><line class="st5" x1="19" y1="6.9" x2="19" y2="17.4"/><line class="st5" x1="18.9" y1="17.5" x2="17.3" y2="17.5"/><line class="st5" x1="19" y1="6.8" x2="17.4" y2="6.8"/><text transform="matrix(1 7.071076e-03 -7.071076e-03 1 20.3871 15.9375)" class="st6 st1 st7">*</text></svg>'

        svg.append("g").html(logo_xml);

        var width = d3.select("svg").select("g").node().getBoundingClientRect().width;
        // TODO height is not right for comparison
        var height = d3.select("svg").select("g").node().getBoundingClientRect().height;

        d3.select("#exportLogo").attr("width", "75px")
            .attr("x", 20)
            .attr("y", -height / 2 - 45)
            .style("position", "absolute")
            .style("bottom", "5px")
            .style("right", "27px");
    }


    function createLadderizedTree(canvasId, ladderizeClass, baseTree) {
        //renders the manual zoom slider if turned on
        var ladderizeButton = d3.select("#" + canvasId).select("." + ladderizeClass).append("div");
        ladderizeButton.append("button")
            .attr("id", "ladderizeAscButton")
            .attr("class", "btn btn-sm sharp asc")
            .attr("title", "Ladderize Tree")
            .attr("type", "button")
            .append("span")
            .text("asc");

        d3.select("#" + canvasId).select(".asc")
            .on('click', function () {
                ladderizeTree(baseTree, "ascending")
            });

        //var downloadButton = d3.select("#"+canvasId).select("."+ladderizeClass).append("div");
        ladderizeButton.append("button")
            .attr("id", "ladderizeDescButton")
            .attr("class", "btn btn-sm sharp desc")
            .attr("title", "Ladderize Tree")
            .attr("type", "button")
            .append("span")
            .text("desc");

        d3.select("#" + canvasId).select(".desc")
            .on('click', function () {
                ladderizeTree(baseTree, "descending")
            });
    }

    function splitsToBitString(tree, funcType) {

        function getLeafNames(leaves) {
            var allLeafNames = [];
            for (var i = 0; i < leaves.length; i++) {
                allLeafNames.push(leaves[i].name);
            }
            return allLeafNames.sort()
        }

        var allLeaves = tree.root.leaves;
        var allLeafNames = getLeafNames(allLeaves);
        var allLeafMaxNum = bigInt(Math.pow(2, allLeafNames.length) - 1);

        var allSplits = [];
        var allBinaryStrings = [];
        var allSplitsDict = {};

        postorderTraverse(tree.root, function (d) {
            if (d.children || d._children && (funcType === "RF" || funcType === "SPR" || funcType === "EUC")) {
                var leafNames = getLeafNames(d.leaves);
                var binaryString = "";
                for (var i = 0; i < allLeafNames.length; i++) {
                    if (leafNames.indexOf(allLeafNames[i]) !== -1) {
                        binaryString += "1";
                    } else {
                        binaryString += "0";
                    }
                }
                var tmpNum = bigInt(parseInt(binaryString, 2));
                if (tmpNum.compare(allLeafMaxNum.over(2)) === 1) {
                    var num = allLeafMaxNum.minus(tmpNum);
                    // console.log(binaryString)
                    binaryString = stringInverter(binaryString);
                    // console.log(binaryString)
                } else {
                    var num = tmpNum;
                }
                allBinaryStrings.push(binaryString); // strings
                //allSplits.push(num); // numbers (??)
                allSplitsDict[binaryString] = d.length; // string - length dictionary
            }
        }, true);
        return [allSplitsDict, allBinaryStrings];
    }

    function calcRFDist(leftTree, rightTree) {
        var leftSplits = splitsToBitString(leftTree, 'RF');
        var rightSplits = splitsToBitString(rightTree, 'RF');
        var allSplitsIDs = _.uniq(leftSplits[1].concat(rightSplits[1]));
        var intersectingSplitsIDs = _.intersection(leftSplits[1], rightSplits[1]);
        var rf = allSplitsIDs.length - intersectingSplitsIDs.length;
        var rfRelative = rf / ((leftTree.root.leaves.length - 3) + (rightTree.root.leaves.length - 3));

        return [rf, rfRelative.toFixed(2)];
    }


    function calcEuclidean(leftTree, rightTree) {
        var branchScore = 0;
        var leftData = splitsToBitString(leftTree, 'EUC'); // [0]: object, [1]: list of strings
        var rightData = splitsToBitString(rightTree, 'EUC');

        var leftDataDict = leftData[0];
        var leftDataList = leftData[1];
        var rightDataDict = rightData[0];
        var rightDataList = rightData[1];

        // console.log('leftDataDict', leftDataDict);
        var uniqueData = _.uniq(leftDataList.concat(rightDataList));  //array of strings without duplications
        // console.log('uniqueData', uniqueData);
        var agrSplits = _.intersection(leftDataList, rightDataList); //agreement splits

        for (var i = 0; i < uniqueData.length; i++) {
            var tmpStr = uniqueData[i];
            if (agrSplits.indexOf(tmpStr) !== -1) {
                branchScore += Math.pow((leftDataDict[tmpStr] - rightDataDict[tmpStr]), 2);
            }
            else if (leftDataList.indexOf(tmpStr) !== -1) {
                branchScore += Math.pow(leftDataDict[tmpStr], 2);
            }
            else {
                branchScore += Math.pow(rightDataDict[tmpStr], 2);
            }
        }

        var euclDist = Math.sqrt(branchScore);
        return euclDist.toFixed(3)
    }


    function calcSPR(leftTree, rightTree) {
        var globalCount = 0;

        var leftSplitsStr = splitsToBitString(leftTree, 'SPR')[1];
        var rightSplitsStr = splitsToBitString(rightTree, 'SPR')[1];

        var agrSplits = intersectBuilder(leftSplitsStr, rightSplitsStr)[0];
        var uniqueSplitsLeft = intersectBuilder(leftSplitsStr, rightSplitsStr)[1];
        var uniqueSplitsRight = intersectBuilder(leftSplitsStr, rightSplitsStr)[2];

        // checking whether unique splits exist
        if (uniqueSplitsLeft.length !== 0 || uniqueSplitsRight.length !== 0) {
            globalCount = minDsFinder(globalCount, agrSplits, uniqueSplitsLeft, uniqueSplitsRight);
            var SPR = globalCount - 1;
        } else {
            SPR = 0;
        }
        return SPR
    }


    // in strings corresponding to cherries, find index of leaf to be cut
    function getCherries(splitStr) {

        var zeroCount = counter(splitStr)[0];
        var oneCount = counter(splitStr)[1];
        if (oneCount == 2) {
            var tmpInd = splitStr.indexOf("1");
        }
        else if (zeroCount == 2) {
            tmpInd = splitStr.indexOf("0");
        }
        return tmpInd
    }

    function intersectBuilder(leftSplits, rightSplits) {
        var uniqueSplitsLeft = [];
        var uniqueSplitsRight = [];
        var agrSplits = _.intersection(leftSplits, rightSplits);

        uniqueSplitsLeft = leftSplits.filter(function (x) {
            return !rightSplits.includes(x);
        });

        uniqueSplitsRight = rightSplits.filter(function (x) {
            return !leftSplits.includes(x);
        });

        uniqueSplitsLeft = _.uniq(uniqueSplitsLeft);
        uniqueSplitsRight = _.uniq(uniqueSplitsRight);

        return [agrSplits, uniqueSplitsLeft, uniqueSplitsRight]
    }

    // update lists, cutting the leaf found by getCherries or minStrSplicer from all splits
    function updateList(myList, tmpInd) {
        var newList = [];
        for (var i = 0; i < myList.length; i++) {
            var tmpStr = myList[i];
            tmpStr = tmpStr.slice(0, tmpInd) + tmpStr.slice(tmpInd + 1);

            //invert strings in case on the wrong side of the tree
            var zeroCount = counter(tmpStr)[0];
            var oneCount = counter(tmpStr)[1];
            if (oneCount > zeroCount) {
                tmpStr = stringInverter(tmpStr);
            }

            if (oneCount > 1) {
                newList.push(tmpStr);
            }
        }
        return newList
    }


    // counts the number of characters avoiding loops
    function counter(myString) {
        var myStringTmp = myString;
        myString = myString.replace(/1/g, "");
        var zeroCount = myString.length;
        myStringTmp = myStringTmp.replace(/0/g, "");
        var oneCount = myStringTmp.length;
        return [zeroCount, oneCount]
    }


    // invert '1's into '0's when required
    function stringInverter(myString) {
        var b1 = myString.replace(/1/g, "a");
        var b2 = b1.replace(/0/g, "1");
        var b3 = b2.replace(/a/g, "0");
        return b3
    }

    // iterate through agr. splits until no cherries to cut
    function simplifySplits(agrSplits, leftSplits, rightSplits) {
        var extend = false;
        for (var i = 0; i < agrSplits.length; i++) {
            var tmpStr = agrSplits[i];
            var cherInd = getCherries(tmpStr);
            if (typeof (cherInd) !== 'undefined') {
                extend = true;
                leftSplits = updateList(leftSplits, cherInd);
                rightSplits = updateList(rightSplits, cherInd);
                agrSplits = updateList(agrSplits, cherInd);
            }
        }

        if (extend) {
            return simplifySplits(agrSplits, leftSplits, rightSplits);
        }
        return [agrSplits, leftSplits, rightSplits];
    }

    // bitwise xor operator on a pair of strings
    function xorStringBuilder(bitString1, bitString2) {
        var xorString = "";
        for (var i = 0; i < bitString1.length; i++) {
            xorString = xorString.concat(bitString1.charCodeAt(i) ^ bitString2.charCodeAt(i));
        }
        return xorString
    }

    // construct disagreement split matrix
    function matrixBuilder(leftSplits, rightSplits) {
        //     var xorStrDict = {};
        //     for (var i = 0; i < leftSplits.length; i++) {
        //         for (var j = 0; j < rightSplits.length; j++) {
        //             var tmpStr = xorStringBuilder(leftSplits[i], rightSplits[j]);
        //             var tmpNum = counter(tmpStr)[1];
        //             xorStrDict[tmpStr] = tmpNum;
        //         }
        //     }
        //     console.log('xorStrDict', xorStrDict);
        //     return xorStrDict
        // }

        //fill in the matrix and determine number of '1'
        var dsMatrix = [];
        var tmpDsMatrix = [];
        for (var i = 0; i < leftSplits.length; i++) {
            dsMatrix.push([]);
            tmpDsMatrix.push([]);
            for (var j = 0; j < rightSplits.length; j++) {
                var tmpStr = xorStringBuilder(leftSplits[i], rightSplits[j]);
                var tmpNum = 0;
                for (var l = 0; l < tmpStr.length; l++) {
                    if (tmpStr[l] == '1') {
                        tmpNum += 1
                    }
                }

                tmpDsMatrix[i].push(tmpNum);
                dsMatrix[i].push(tmpStr);

            }
        }
        return [dsMatrix, tmpDsMatrix]
    }




    // cut the leaves in disagreement
    function minStrSplicer(minimumString, myList) {
        var tmpInd = minimumString.indexOf('1'); //TODO: are you going through the list????
        if (tmpInd != -1) {
            minimumString = minimumString.slice(0, tmpInd) + minimumString.slice(tmpInd + 1);
            myList = updateList(myList, tmpInd);
            return minStrSplicer(minimumString, myList);
        }
        return myList
    }


    // this function actually does iteration
    function minDsFinder(globalCount, agrSplits, leftSplits, rightSplits) {
        globalCount += 1;
        //TODO: here has to be the intersection called again (remove from main and put here)
        var simplifiedSplits = simplifySplits(agrSplits, leftSplits, rightSplits); // remove agr. cherries
        // agrSplits = simplifiedSplits[0];
        leftSplits = simplifiedSplits[1];
        rightSplits = simplifiedSplits[2];

        var intersections = intersectBuilder(leftSplits, rightSplits);
        agrSplits = intersections[0];  // rebuild splits lists
        leftSplits = intersections[1];
        rightSplits = intersections[2];


        if (leftSplits.length != 0 && rightSplits.length != 0) {

            var matrix = matrixBuilder(leftSplits, rightSplits);// build the xor string/number lists
            var dsMatrix = matrix[0];
            var tmpDsMatrix = matrix[1];
            var minRow = tmpDsMatrix.map(function (row) { // find the shortest DS
                return Math.min.apply(Math, row);
            });
            var minValue = Math.min.apply(null, minRow);
            // console.log(minValue);

            for (var i = 0; i < tmpDsMatrix.length; i++) {
                for (var j = 0; j < tmpDsMatrix[i].length; j++) {
                    if (tmpDsMatrix[i][j] == minValue) {
                        var minString = dsMatrix[i][j];
                        break;
                    }
                }
            }

            var agrSplitsUpd = minStrSplicer(minString, agrSplits);
            var leftSplitsUpd = minStrSplicer(minString, leftSplits);
            var rightSplitsUpd = minStrSplicer(minString, rightSplits);
            //console.log(leftSplitsUpd);
            // we should see that all the splits are of the same length!!!
            //TODO: here you have to make sure that we are still looking at the right side of the tree (you should allways have a smaller number of 1s than 0s, if the same number you have define what you are looking at 0011 or 1100 )
            return minDsFinder(globalCount, agrSplitsUpd, leftSplitsUpd, rightSplitsUpd);

        }
        return globalCount
    }

    function getIntersectionOfLeaves(leftLeaves, rightLeaves) {
        return _.intersection(leftLeaves, rightLeaves)
    }

    function getIntersectingTrees(leftTree, rightTree, commonLeaves) {
        var leftTreeIndex = findTreeIndex(leftTree.name);
        var rightTreeIndex = findTreeIndex(rightTree.name);
        postorderTraverse(leftTree.root, function (d) {
            if (!d.children && !d._children) {
                if (commonLeaves.indexOf(d.name) < 0) {
                    updateUndo(leftTreeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, leftTree);
                    var index1 = findTreeIndex(leftTree.name);
                    var index2 = findTreeIndex(rightTree.name);

                    preprocessTrees(trees[index1], trees[index2]);
                    update(leftTree.root, cutTree.data);
                    update(rightTree.root, rightTree.data);
                }
            }

        });
        postorderTraverse(rightTree.root, function (d) {
            if (!d.children && !d._children) {
                if (commonLeaves.indexOf(d.name) < 0) {
                    updateUndo(rightTreeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, rightTree);
                    var index1 = findTreeIndex(rightTree.name);
                    var index2 = findTreeIndex(leftTree.name);

                    preprocessTrees(trees[index1], trees[index2]);
                    update(rightTree.root, cutTree.data);
                    update(leftTree.root, leftTree.data);
                }
            }

        });

    }


    function calcDist() {
        var leftIdx = d3.select("#vis-container1").select("svg").attr("id").split("_")[1];
        var rightIdx = d3.select("#vis-container2").select("svg").attr("id").split("_")[1];
        var leftTree = trees[leftIdx];
        var rightTree = trees[rightIdx];
        if ((leftTree.root.deepLeafList.length > 100 || rightTree.root.deepLeafList.length > 100)) {

            $('#modalTitleError').html('Too complex tree');
            $('#modalBodyError').html("One or both trees have too many leaves. 100 leaves is the maximum.");
            $('#myErrorModal').modal('show');
            return false;

        }

        var leftLeaves = leftTree.root.deepLeafList.sort();
        var rightLeaves = rightTree.root.deepLeafList.sort();
        var commonLeaves = getIntersectionOfLeaves(leftLeaves, rightLeaves);
        var sameLeaves = _.isEqual(leftLeaves, rightLeaves);
        if (sameLeaves) {
            var distArray = [];
            distArray.push(calcRFDist(leftTree, rightTree), calcEuclidean(leftTree, rightTree), calcSPR(leftTree, rightTree));// add other metrics here
            return distArray
        } else {
            alert('Trees have different leaf sets. Left and right trees are trimmed')
            getIntersectingTrees(leftTree, rightTree, commonLeaves);
            var distArray = [];
            distArray.push(calcRFDist(leftTree, rightTree), calcEuclidean(leftTree, rightTree), calcSPR(leftTree, rightTree));// add other metrics here
            return distArray

        }

    }


    function LogGamma(Z) {
        with (Math) {
            var S = 1 + 76.18009173 / Z - 86.50532033 / (Z + 1) + 24.01409822 / (Z + 2) - 1.231739516 / (Z + 3) + .00120858003 / (Z + 4) - .00000536382 / (Z + 5);
            var LG = (Z - .5) * log(Z + 4.5) - (Z + 4.5) + log(S * 2.50662827465);
        }
        return LG
    }

    function Betinc(X, A, B) {
        var A0 = 0;
        var B0 = 1;
        var A1 = 1;
        var B1 = 1;
        var M9 = 0;
        var A2 = 0;
        var C9;
        while (Math.abs((A1 - A2) / A1) > .00001) {
            A2 = A1;
            C9 = -(A + M9) * (A + B + M9) * X / (A + 2 * M9) / (A + 2 * M9 + 1);
            A0 = A1 + C9 * A0;
            B0 = B1 + C9 * B0;
            M9 = M9 + 1;
            C9 = M9 * (B - M9) * X / (A + 2 * M9 - 1) / (A + 2 * M9);
            A1 = A0 + C9 * A1;
            B1 = B0 + C9 * B1;
            A0 = A0 / B1;
            B0 = B0 / B1;
            A1 = A1 / B1;
            B1 = 1;
        }
        return A1 / A
    }

    /*function computePval(X, df) {
        with (Math) {
            if (df <= 0) {
                alert("Degrees of freedom must be positive")
            } else {
                A = df / 2;
                S = A + .5;
                Z = df / (df + X * X);
                BT = exp(LogGamma(S) - LogGamma(.5) - LogGamma(A) + A * log(Z) + .5 * log(1 - Z));
                if (Z < (A + 1) / (S + 2)) {
                    betacdf = BT * Betinc(Z, A, .5)
                } else {
                    betacdf = 1 - BT * Betinc(1 - Z, .5, A)
                }
                if (X < 0) {
                    tcdf = betacdf / 2
                } else {
                    tcdf = 1 - betacdf / 2
                }
            }
            tcdf = round(tcdf * 100000) / 100000;
        }
        return tcdf
    }*/





    //Finding commmon ancestor
    function commonAncestor(regex) {
        if (multiSelected[0] != null && multiSelected[1] != null) {
            selectedOne = multiSelected[0]
            selectedTwo = multiSelected[1]

            if (selectedOne.ID == selectedTwo.parent.ID) {
                st = selectedOne
            }
            else if (selectedTwo.ID == selectedOne.parent.ID) {
                st = selectedTwo
            }
            else {
                parentOne = selectedOne
                parentTwo = selectedTwo
                check = true
                for (i = 0; i <= selectedOne.depth; i++) {
                    parentTwo = selectedTwo
                    for (j = 0; j <= selectedTwo.depth; j++) {
                        if (parentOne.ID == parentTwo.ID) {
                            st = parentOne
                            check = false
                            break
                        }
                        if (parentTwo.depth != 0) {
                            parentTwo = parentTwo.parent
                        }
                    }
                    if (check == false) {
                        break
                    }
                    else {
                        if (parentOne.depth != 0) {
                            parentOne = parentOne.parent
                        }
                    }
                }
            }

            if (st.depth == 0) {
                var str =
                    "ID: " + st.ID.toString() +
                    "\nName: " + st.name.toString() +
                    "\nLength: " + st.length.toString() +
                    "\nDepth: " + st.depth.toString() +
                    "\nParent: This is the root"
            }
            else {
                var str =
                    "ID: " + st.ID.toString() +
                    "\nName: " + st.name.toString() +
                    "\nLength: " + st.length.toString() +
                    "\nDepth: " + st.depth.toString() +
                    "\nParent: " +
                    "\n\tID: " + st.parent.ID.toString() +
                    "\n\tName: " + st.parent.name.toString() +
                    "\n\tLength: " + st.parent.length.toString() +
                    "\n\tDepth: " + st.parent.depth.toString()
            }
            document.getElementById('ancestor12').value = str
            distSelected(st)
            distFromLeaves(st, regex)
        }
        else {
            document.getElementById('ancestor12').value = ""
            //document.getElementById('dist12').value = ""
            boxPlotEachOther(null, null)
            boxPlotLeaves(null, null)
        }

    }

    //Finding distance of the multiselected
    function distSelected(ancs) {

        selectedOne = multiSelected[0]
        selectedTwo = multiSelected[1]
        dist = 0
        while (selectedOne != ancs) {
            dist = dist + selectedOne.length
            selectedOne = selectedOne.parent
        }
        while (selectedTwo != ancs) {
            dist = dist + selectedTwo.length
            selectedTwo = selectedTwo.parent
        }
        //document.getElementById('dist12').value = dist
    }

    function boxPlotEachOther(one, two) {

        if (one == null || two == null) {
            Plotly.purge('boxPlotID');
            document.getElementById('ttest1').value = "";
            document.getElementById('pval1').value = "";
            meanObj.leftMean1 = 0;
            meanObj.leftMean2 = 0;
            meanObj.rightMean1 = 0;
            meanObj.rightMean2 = 0;
        }
        else if (one != null && two != null) {
            df = one.length + two.length - 2

            tempOne = []
            for (i = 0; i < one.length; i++) {
                tempOne.push(one[i].Distance)
            }
            tempTwo = []
            for (i = 0; i < two.length; i++) {
                tempTwo.push(two[i].Distance)
            }
            one = tempOne
            two = tempTwo
            var trace1 = {
                y: one,
                name: nameObj.node1,
                type: 'violin',
                box: {
                    visible: true
                },
                boxpoints: false,
                jitter: 0.5,
                whiskerwidth: 0.2,
                color: colorObj.color1,
                marker: {
                    color: colorObj.color1,
                    size: 2,
                    opacity: 0.2,
                    line: {
                        color: colorObj.color1,
                        width: 1
                    }
                },
                boxmean: true

            };

            var trace2 = {
                y: two,
                name: nameObj.node2,
                type: 'violin',
                box: {
                    visible: true,
                },
                boxpoints: false,
                jitter: 0.5,
                whiskerwidth: 0.2,
                marker: {
                    color: colorObj.color2,
                    size: 2,
                    opacity: 0.2,
                    line: {
                        color: colorObj.color2,
                        width: 1
                    }
                },
                boxmean: true
            };

            var data = [trace1, trace2];
            mean1 = 0
            mean2 = 0

            for (i = 0; i < one.length; i++) {
                mean1 += one[i]
            }
            mean1 = mean1 / one.length

            for (i = 0; i < two.length; i++) {
                mean2 += two[i]
            }
            mean2 = mean2 / two.length

            meanObj.leftMean1 = mean1;
            meanObj.leftMean2 = mean2;

            stdev1 = 0
            for (i = 0; i < one.length; i++) {
                temp = mean1 - one[i]
                temp = temp * temp
                stdev1 += temp
            }
            
            len1= one.length-1
            stdev1 = stdev1 / len1
            stdev1 = Math.sqrt(stdev1)

            stdev2 = 0
            for (i = 0; i < two.length; i++) {
                temp = mean2 - two[i]
                temp = temp * temp
                stdev2 += temp
            }
            
            len2= two.length-1
            stdev2 = stdev2 / len2
            stdev2 = Math.sqrt(stdev2)

            x1 = stdev1 * stdev1 / one.length
            x2 = stdev2 * stdev2 / two.length

            x = Math.sqrt(x1 + x2)

            tTest = mean1 - mean2
            
            // Elif's implementation
            welchs_t= tTest/x
            // End

            n1 = one.length;
            n2 = two.length;

            tmp1 = (n1 - 1) * stdev1 * stdev1
            tmp2 = (n2 - 1) * stdev2 * stdev2
            tmp = tmp1 + tmp2;
            tmp = tmp / (n1 + n2 - 2)
            tmp3 = (1 / n1) + (1 / n2)
            tmp = tmp * tmp3;
            tmp = Math.sqrt(tmp);

            //T distribution is symmetric so there is no need for negative values, it makes p value weird 
         
            //tTest = tTest / x
            tTest = tTest / tmp;
            document.getElementById('ttest1').value = tTest
            document.getElementById('ttest1_w').value = welchs_t

            Plotly.newPlot('boxPlotID', data)
                .then(
                    function (gd) {
                        Plotly.toImage(gd, { height: 600, width: 660 })
                            .then(
                                function (url) {
                                    img_jpg_plot1.attr("src", url);
                                }
                            )
                    });
            if (two) {
                pval = jStat.ttest(tTest, df, 2)
                document.getElementById("pval1").value = pval
                
                // Elif's implementation
                pval_welch_1= jStat.ttest(welchs_t, df, 2)
                document.getElementById("pval_welch_1").value = pval_welch_1
                // end
            }
        }
    }

    function purgePlots() {

        Plotly.purge('boxPlotID');
        Plotly.purge('boxPlot2ID');
        A = 0
        B = 0
        AB = 0
        chart = Highcharts.chart('regExVenn', {
            series: [{
            }],
            title: {
                text: 'Search Results'
            }
        });
        chart
        chart.destroy();
        meanObj.leftMean1 = 0;
        meanObj.leftMean2 = 0;
        meanObj.rightMean1 = 0;
        meanObj.rightMean2 = 0;
    }

    function boxPlotLeaves(one, two) {

        if (one == null && two == null) {
            Plotly.purge('boxPlot2ID');
            document.getElementById('ttest2').value = "";
            document.getElementById('pval2').value = "";
        }
        else if (one != null && two != null) {
            df = one.length + two.length - 2

            tempOne = []
            for (i = 0; i < one.length; i++) {
                tempOne.push(one[i])
            }
            tempTwo = []
            for (i = 0; i < two.length; i++) {
                tempTwo.push(two[i])
            }
            
            global_one= one
            global_two= two
            one = tempOne
            two = tempTwo
            var trace1 = {
                y: one,
                name: nameObj.node1,
                type: 'violin',
                box: {
                    visible: true
                },
                boxpoints: false,
                jitter: 0.5,
                whiskerwidth: 0.2,
                color: colorObj.color1,
                marker: {
                    color: colorObj.color1,
                    size: 2,
                    opacity: 0.2,
                    line: {
                        color: colorObj.color1,
                        width: 1
                    }
                },
                boxmean: true
            };

            var trace2 = {
                y: two,
                name: nameObj.node2,
                type: 'violin',
                box: {
                    visible: true
                },
                boxpoints: 'all',
                jitter: 0.5,
                whiskerwidth: 0.2,
                marker: {
                    color: colorObj.color2,
                    size: 2,
                    opacity: 0.2,
                    line: {
                        color: colorObj.color2,
                        width: 1
                    }
                },
                boxmean: true
            };

            var data = [trace1, trace2];
            mean1 = 0
            mean2 = 0

            for (i = 0; i < one.length; i++) {
                mean1 += one[i]
            }
            mean1 = mean1 / one.length

            for (i = 0; i < two.length; i++) {
                mean2 += two[i]
            }
            mean2 = mean2 / two.length

            meanObj.rightMean1 = mean1;
            meanObj.rightMean2 = mean2;

            stdev1 = 0
            for (i = 0; i < one.length; i++) {
                temp = mean1 - one[i]
                temp = temp * temp
                stdev1 += temp
            }
            
            len1= one.length-1
            stdev1 = stdev1 / len1
            stdev1 = Math.sqrt(stdev1)

            stdev2 = 0
            for (i = 0; i < two.length; i++) {
                temp = mean2 - two[i]
                temp = temp * temp
                stdev2 += temp
            }
            
            len2= two.length-1
            stdev2 = stdev2 / len2
            stdev2 = Math.sqrt(stdev2)

            x1 = stdev1 * stdev1 / one.length
            x2 = stdev2 * stdev2 / two.length

            x = Math.sqrt(x1 + x2)
            

            tTest = mean1 - mean2
            n1 = one.length;
            n2 = two.length;
            
            welchs_t= tTest/x

            tmp1 = (n1 - 1) * stdev1 * stdev1
            tmp2 = (n2 - 1) * stdev2 * stdev2
            tmp = tmp1 + tmp2;
            tmp = tmp / (n1 + n2 - 2)
            tmp3 = (1 / n1) + (1 / n2)
            tmp = tmp * tmp3;
            tmp = Math.sqrt(tmp);

            //T distribution is symmetric so there is no need for negative values, it makes p value weird 
           
            //tTest = tTest / x
            //console.log("x: ", tTest / x, "\n")
            //console.log("tmp: ", tTest / tmp)
            tTest = tTest / tmp;
            document.getElementById('ttest2').value = tTest
            document.getElementById('ttest2_w').value = welchs_t
            Plotly.newPlot('boxPlot2ID', data)
                .then(
                    function (gd) {
                        Plotly.toImage(gd, {height: 600, width: 660 })
                            .then(
                                function (url) {
                                    img_jpg_plot2.attr("src", url);
                                }
                            )
                    });
            if (two) {
                pval = jStat.ttest(tTest, df, 2)
                document.getElementById("pval2").value = pval
                
                // Elif's implementation
                pval_welch_2= jStat.ttest(welchs_t, df, 2)
                document.getElementById("pval_welch_2").value = pval_welch_2
                // end
            }
        }
    }
    
   function label_changer(dict){
        key_list= Object.keys(dict)
        for (let i=0; i<key_list.length; i++){
            var elements = dict[key_list[i]]
            if (elements.length == 3){ // Only leaves
                arr1= elements[0].match(regex_global)
                if (global_common.includes(arr1[0])){
                    elements[1]="yes"
                }
                else{
                        elements[1]="no"
                }
            }
        }
   }


     function check_parent(clade,dict){

            if ("ID" in clade){

                var len= 0
                var child1= dict[clade.children[0].ID]
                var child2= dict[clade.children[1].ID]
                lengths=[]

                // handle the leaf situation too. 

                if (child1){ // could be a deleted leaf 

                    
                    if (child1.length == 5){

                        lengths.push(child1[4].length)
                    }


                    else{ // Its a leaf && since its in dictionary its included. 

                        lengths.push(0)
                    }

                   
                }

                else{ // The leaf is not in dictionary, which means that it should be deleted. 

                    lengths.push(2)
                }



                if (child2){ // could be a deleted leaf 

                    
                    if (child2.length == 5){

                        lengths.push(child2[4].length)
                    }
                    

                    else{ // Its a leaf && since its in dictionary its included. 

                        lengths.push(0)
                    }

                   
                }

                else{ // The leaf is not in dictionary, which means that it should be deleted. 

                    lengths.push(2)
                }

            }

            if (lengths.includes(2)){


                return 0;
            }


            return 1; 

        }


       function clade_json(clade,dict,first_zero){

            if ("children" in clade){

                var len= 0
                len= clade.children.length

                for (let i=0; i<len; i++){

                    var child_ = clade.children[i]

                    if (child_.ID == first_zero){

                        dict["child1"]= child_.parent.children[0].ID
                        dict["child2"]= child_.parent.children[1].ID


                    }

                    else {

                       clade_json(child_,dict,first_zero)

                    }


                }

            }

        }


    
        function call_tree(tree,alieren){
        if ("children" in tree){
            
            var len= 0
            len= tree.children.length
            for (let i=0; i<len; i++){
                var child_ = tree.children[i]
                var arr1= tree.name.match(regex_global)
                  children_list=[]
                  if ("children" in child_){
                     children_list.push(child_.children)
                  }
                  else{
                      children_list.push("NaN")
                  }
                 
                  children_list.push(child_.length)
                  children_list.push(child_.leaves.length)
                  children_list.push(child_.parent)
                  children_list.push("label")
                  alieren[child_.ID] = children_list
                  call_tree(child_,alieren)
          }
              
       }
       else{
          children_list=[]
          children_list.push(tree.name)
          children_list.push("label")
          children_list.push(tree.length)
          
          alieren[tree.ID] = children_list
       }
   }
    
    function eliminate_dict(dict,main_list){

        names_temp=[]

        for (let k=0; k<main_list.length; k++){

            names_temp.push(main_list[k].From)

        }

         key_list= Object.keys(dict)

        for (let i=0; i<key_list.length; i++){

            var elements = dict[key_list[i]]

            if (elements.length == 3){ 

                if (!(names_temp.includes(elements[0]))){


                    delete dict[key_list[i]]
                }

                
            }
        }
       

    }
    
    function isoform_eliminate(list,new_iso_list){

        
        for (let i=0; i<list.length;i++){

            var arr1 = list[i].From.match(regex_global)
            target_taxa= arr1[0]
            
            min=10000

            for (let k=0; k<list.length; k++){

                if (target_taxa == list[k].From.match(regex_global)){

                    if (min>list[k].Distance){

                        min=list[k].Distance
                        min_name= list[k].From
                    }
                }
            }

            if (!(new_iso_list.includes(min_name))){


                new_iso_list.push(min_name)
            }
        }

    }
    
    
    function leaf_handler(dict,length_list,sample_size){

        key_list= Object.keys(dict)

        for (let i=0; i<key_list.length; i++){

            var elements = dict[key_list[i]]

            if (elements.length == 3){ // Only leaves
                
                if (elements[1] == "yes"){


                    length_list.push(elements[2])
                    sample_size=sample_size+1

                }

                else{

                    elements[2]=0
                }
          
            }
       } 

       return sample_size

    }


    function main_node_handler(dict,length_list,sample_size,key_list){


        for (let i=0; i<key_list.length; i++){

           

            var elements = dict[key_list[i]]

            if (elements.length == 5){ // Only nodes


                // 2 durumu:
                
                if(elements[4].length == elements[0].length){


                    elements[1]=0

                } 

                // 0 durumu

                else if(elements[4].length == 0){

                 

                   
                    sample_size=sample_size+1
                    length_list.push(elements[1])
                    

                }
                
                
                else if (elements[4].length == 1){
                    
                    child_size= elements[0].length
                    let temp_sum=0
                    // child can be a node or a leaf the index changes
                    // call children by IDs, its dynamic 
                    for (let m=0; m<child_size; m++){

                        var temp_ID= elements[0][m].ID
                        var elements2 = dict[temp_ID]

                        if (!(elements2)){

                            continue

                        }

                        else if (elements2.length == 3){ // its a leaf 


                            if (elements2[1] == "no"){

                             
                                continue;
                            }

                            else{
                                
                            temp_sum+=elements2[2]
                            length_list.push(-1*elements2[2])
                            sample_size=sample_size-1
                            elements2[2]=0
                            }
                        }

                        else{ // its a node 

                            if(temp_ID == elements[4][0] ){

                                elements2[1]=0
                            }

                            else{
                            
                                temp_sum+= elements2[1]
                                length_list.push(-1*elements2[1])
                                sample_size=sample_size-1
                                elements2[1]=0

                            }
                        }

                    }

                    length_list.push(temp_sum)
                    sample_size+=1

                }


                // 

                else{
                    
                    temp_len=elements[4].length
                    for (let n=0; n<temp_len;n++){
                        
                        curr_ID=elements[4][n]
                        
                        if (dict[curr_ID]){
                            
                            if( dict[curr_ID].length == 3) {
                                
                                dict[curr_ID][2]=0
                                 
                            }
                            
                            else {
     
                                dict[curr_ID][1]= 0
                            }
                            
                        }
                        
                    }

                }


 
          
            }
       } 

       return sample_size

    }
    

    function get_data_points(length_list){


        len_t= length_list.length 
        for(let i=0; i<len_t; i++){

            if (length_list[i]<0 && length_list[i]!=-10){
                
                search_val= length_list[i]*-1
                temp_target= length_list.indexOf(search_val)
                length_list[i]=-10
                length_list[temp_target]=-10

            }
        }

        temp_points=[]
        for(let i=0; i<len_t; i++){

            if (length_list[i] != -10){

                temp_points.push(length_list[i])
            }

        }

        return temp_points
    }





    //Distance from leaves
    function distFromLeaves(ancs, regex) {
        selectedOne = multiSelected[0]
        leavesOne = selectedOne.leaves
        leave_one_before_regex=[]
        leave_one_before_regex=leavesOne
        leavesOneEachother = []
        leavesOneDist = []
        selectedTwo = multiSelected[1]
        leavesTwo = selectedTwo.leaves
        leave_two_before_regex=[]
        leave_two_before_regex=leavesTwo
        leavesTwoEachother = []
        leavesTwoDist = []
        if (!regex) {
            beginning = true;
            regexSearch(beginning)
        }

        if (regex) {
            
               for (i = 0; i < leavesOne.length; i++) {
                distance = 0
                temp = leavesOne[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leavesOne[i].name,
                    where:"",
                    Distance: distance
                }
                leavesOneDist.push(tmp)
            }
            for (i = 0; i < leavesTwo.length; i++) {
                distance = 0
                temp = leavesTwo[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leavesTwo[i].name,
                    where:"",
                    Distance: distance
                }
                leavesTwoDist.push(tmp)

           }

           if (global_common.length != 0){


               list1=[]
               list2=[]
               isoform_eliminate(leavesOneDist,list1)
               isoform_eliminate(leavesTwoDist,list2)
               new_list1=[]
               new_list2=[]

               
               for (let i=0; i<leavesOne.length; i++){

                   var arr2= leavesOne[i].name.match(regex_global)

                   if(list1.includes(leavesOne[i].name) && global_common.includes(arr2[0])){

                       new_list1.push(leavesOne[i])


                   }

               }

                for (let i=0; i<leavesTwo.length; i++){

                   var arr2= leavesTwo[i].name.match(regex_global)

                   if(list2.includes(leavesTwo[i].name) && global_common.includes(arr2[0]) ){

                       new_list2.push(leavesTwo[i])


                   }

               }

               leavesOne=new_list1
               leavesTwo=new_list2

               new_list1=[]
               new_list2=[]


               for (let i=0; i<leavesOneDist.length; i++){

                    var arr2= leavesOneDist[i].From.match(regex_global)

                   if(list1.includes(leavesOneDist[i].From) && global_common.includes(arr2[0]) ){

                       new_list1.push(leavesOneDist[i])


                   }

               }


                for (let i=0; i<leavesTwoDist.length; i++){

                   var arr2= leavesTwoDist[i].From.match(regex_global)

                   if(list2.includes(leavesTwoDist[i].From) && global_common.includes(arr2[0])){

                       new_list2.push(leavesTwoDist[i])

                   }

               }


               leavesOneDist=new_list1
               leavesTwoDist=new_list2

            }
            
            
            // try
            
            leaves_one_before_regex_dist=[]
            leaves_two_before_regex_dist=[]
            
           for (i = 0; i < leave_one_before_regex.length; i++) {
                distance = 0
                temp = leave_one_before_regex[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leave_one_before_regex[i].name,
                    where:"",
                    Distance: distance
                }
                leaves_one_before_regex_dist.push(tmp)
            }
            for (i = 0; i < leave_two_before_regex.length; i++) {
                distance = 0
                temp = leave_two_before_regex[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leave_two_before_regex[i].name,
                    where:"",
                    Distance: distance
                }
                leaves_two_before_regex_dist.push(tmp)

            }
            
            
            // Mann Whitney first criteria 
            
                
                temp_leaves=leavesOneDist
                temp_leaves2=leavesTwoDist
                all_lengths_1=[]
                for(i=0; i<temp_leaves.length; i++){

                    temp_leaves[i].where = "A"
                    all_lengths_1.push(temp_leaves[i])

                }

                for(i=0; i<temp_leaves2.length; i++){

                    temp_leaves2[i].where = "B"
                    all_lengths_1.push(temp_leaves2[i])

                }

                // kucukten buyuge siraliyor
                all_lengths_sorted = all_lengths_1.sort((first, second) => first.Distance - second.Distance)

                for (i=0;i<all_lengths_sorted.length;i++){

                    all_lengths_sorted[i].rank = i+1

                }

                // Ali Parlakci implementation.

                for (let i = 0; i < all_lengths_sorted.length;) {
                    let occurence = 1;
                    while ((i + occurence < all_lengths_sorted.length) && (all_lengths_sorted[i].Distance == all_lengths_sorted[i+occurence].Distance)) {
                        occurence++;
                    }


                    ranks = 0;
                    for (let j = i; j < i + occurence; j++) {
                        ranks += all_lengths_sorted[j].rank;
                    }

                    for (let j = i; j < i + occurence; j++) {
                        all_lengths_sorted[j].rank = ranks / occurence;
                    }

                    i += occurence;
                }

                // Ali Parlakci implementation

                n1= temp_leaves.length
                n2= temp_leaves2.length
                rank_sum1=0
                rank_sum2=0

                for (i=0;i<all_lengths_sorted.length;i++){

                    if (all_lengths_sorted[i].where == "A"){


                        rank_sum1+=all_lengths_sorted[i].rank
                    }


                    if (all_lengths_sorted[i].where == "B"){


                        rank_sum2+=all_lengths_sorted[i].rank
                    }

                }

                u1_first= n1*n2+ (n1*(n1+1))/2 - rank_sum1
                u2_first=n1*n2+ (n2*(n2+1))/2 - rank_sum2

                if (u1_first> u2_first){

                    main_u= u2_first
                }

                else {

                    main_u= u1_first
                }

                z_score_top = main_u-(n1*n2)/2
                z_score_bottom= (n1*n2)*(n1+n2+1)/12
                z_score= z_score_top/Math.sqrt(z_score_bottom)          
                p_val_mann_whitney1=jStat.ztest(z_score,2)
                
            
            
            boxPlotEachOther(leavesOneDist, leavesTwoDist)

            turn = 0
            count = 0
            end = (leavesOne.length) * (leavesOne.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leavesOne.length; i++) {
                    str = leavesOne[turn].name + "---" + leavesOne[i].name
                    dis = leavesOne[turn].length + leavesOne[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesOneEachother.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }
            turn = 0
            count = 0
            end = (leavesTwo.length) * (leavesTwo.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leavesTwo.length; i++) {
                    str = leavesTwo[turn].name + "---" + leavesTwo[i].name
                    dis = leavesTwo[turn].length + leavesTwo[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesTwoEachother.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }
            
            
           
            
            
            leavesOneEachother_before_regex=[]
            leavesTwoEachother_before_regex=[]

            turn = 0
            count = 0
            end = (leave_one_before_regex.length) * (leave_one_before_regex.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leave_one_before_regex.length; i++) {
                    str = leave_one_before_regex[turn].name + "---" + leave_one_before_regex[i].name
                    dis = leave_one_before_regex[turn].length + leave_one_before_regex[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesOneEachother_before_regex.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }

            turn = 0
            count = 0
            end = (leave_two_before_regex.length) * (leave_two_before_regex.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leave_two_before_regex.length; i++) {
                    str = leave_two_before_regex[turn].name + "---" + leave_two_before_regex[i].name
                    dis = leave_two_before_regex[turn].length + leave_two_before_regex[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesTwoEachother_before_regex.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }
            
         
            document.getElementById("p_val_mann_whitney1").value = p_val_mann_whitney1
            document.getElementById("z_score").value = z_score
                
            if (bool==false) {
                
            
                dict1={}
                dict2={}
                call_tree(clade_1_json,dict1)
                call_tree(clade_2_json,dict2)
                eliminate_dict(dict1, leavesOneDist)
                eliminate_dict(dict2, leavesTwoDist)
                let keys1 = Object.keys(dict1).filter(el=>dict1[el].length === 5).sort((first,second)=>dict1[first][2]-dict1[second][2])
                let keys2 = Object.keys(dict2).filter(el=>dict2[el].length === 5).sort((first,second)=>dict2[first][2]-dict2[second][2])

                label_changer(dict1)
                label_changer(dict2)

                // label list= 0 -> both of them are included 
                // label list= 1 -> only one child included
                // label list= 2 -> none of the childs are included


                               
                wanted_names1=[]
                for (let i=0; i<leavesOneDist.length; i++){
                    
                    wanted_names1.push(leavesOneDist[i].From)

                }

                wanted_names2=[]
                for (let i=0; i<leavesTwoDist.length; i++){
                    
                    wanted_names2.push(leavesTwoDist[i].From)

                }

                for (i=0; i<keys1.length; i++){

                    var elements= dict1[keys1[i]]
                    childs= elements[0]
                    childs_len= childs.length
                    label=[]
                    // Child could be a main node or a leaf we will find this using regex.
                    for(m=0; m<childs_len; m++){

                        child_ID= childs[m].ID

                        var arr1= childs[m].name.match(regex_global)
                        if (!arr1){ // The child is a main node


                            if (dict1[child_ID][4].length == 0){
                                continue;
                            }

                            else if(dict1[child_ID][4].length < dict1[child_ID][0].length){

                                continue

                            }


                            else{

                                label.push(child_ID)

                            }

                        }

                        else{ //child is a leaf

                            if (!(wanted_names1.includes(childs[m].name))){

                                label.push(child_ID)

                            }

                        }
                    }

                    dict1[keys1[i]][4] = label 
                }


               for (i=0; i<keys2.length; i++){

                    var elements= dict2[keys2[i]]
                    childs= elements[0]
                    childs_len= childs.length
                    label=[]
         
                    // Child could be a main node or a leaf we will find this using regex.
                    for(m=0; m<childs_len; m++){

                        child_ID= childs[m].ID

                        var arr1= childs[m].name.match(regex_global)
                        if (!arr1){ // The child is a main node


                            if (dict2[child_ID][4].length == 0){
                                continue;
                            }

                            else if(dict2[child_ID][4].length < dict2[child_ID][0].length){

                                continue

                            }


                            else{

                                label.push(child_ID) // Add the one which we do not want

                            }

                        }

                        else{ //child is a leaf

                            if (!(wanted_names2.includes(childs[m].name))){

                                label.push(child_ID)

                            }

                        }
                    }

                    dict2[keys2[i]][4] = label 
                }

                  // new ancs try



                // Checking if they really require a new ancestor


                new_ancs1=""
                new_ancs2=""


                let check1= check_parent(clade_1_json,dict1)
                let check2= check_parent(clade_2_json,dict2)


                // If they require we will find the new one 

                if (!check1){

                for (i=keys1.length-1; -1<i ; i--){

                    var elements= dict1[keys1[i]]
                    keep_num= elements[4]
                    if (keep_num.length == 0){
                       
                       first_zero1= keys1[i]
                       break



                    }
            
                   
                 }

                clade_json(clade_1_json,dict1,first_zero1)

                check_parent11= dict1["child1"]
                check_parent11= dict1[check_parent11]

                check_parent12= dict1["child2"]
                check_parent12= dict1[check_parent12]


                if (!check_parent11){

                    check_parent11=0
                }

                else if(!check_parent12) {


                    check_parent12=0
                }



                
                new_ancs1=""

                if (check_parent11 == 0 && check_parent12[4].length == 0){

                    new_ancs1=first_zero1

                }

                 else if (check_parent12 == 0 && check_parent11[4].length == 0){

                    new_ancs1=first_zero1

                }
                
                else if (check_parent11.length == 5 && check_parent12.length == 5){

                    if (check_parent11[4].length == 0 && check_parent12[4].length == 2){

                        new_ancs1= first_zero1
                    }

                    else if(check_parent11[4].length == 2 && check_parent12[4].length == 0){

                        new_ancs1= first_zero1
                    }


                }

               if(new_ancs1 != ""){
                    
                   len1_excluded= dict1[new_ancs1][1]

                }


              }




                // second clade's new ancestor: 



                if (!check2){

               
                for (i=keys2.length-1; -1<i ; i--){

                    var elements= dict2[keys2[i]]
                    keep_num= elements[4]
                    if (keep_num.length == 0){
                       
                       first_zero2= keys2[i]
                       break

                    }
                   
                 }


                clade_json(clade_2_json,dict2,first_zero2)
               
                check_parent21= dict2["child1"]
                check_parent21= dict2[check_parent21]

                check_parent22= dict2["child2"]
                check_parent22= dict2[check_parent22]

                if(!check_parent21){


                    check_parent21=0
                }

                else if (!check_parent22){


                    check_parent22=0
                }

              

                new_ancs2=""

                 if (check_parent21 == 0 && check_parent22[4].length == 0){

                    new_ancs2=first_zero2


                }

                 else if (check_parent22 == 0 && check_parent21[4].length == 0){

                    new_ancs2=first_zero2

                }

                else if (check_parent21.length == 5 && check_parent22.length == 5){

                    if (check_parent21[4].length == 0 && check_parent22[4].length == 2){

                        new_ancs2= first_zero2
                    }

                    else if(check_parent21[4].length == 2 && check_parent22[4].length == 0){

                        new_ancs2= first_zero2
                    }
                }

              
                if(new_ancs2 != ""){

                    len2_excluded= dict2[new_ancs2][1]
                }


            }


            // processing the info 
            


                let length_list1=[]
                let length_list2=[]
                let sample_size2=0
                let sample_size1=0

                sample_size1= leaf_handler(dict1,length_list1,sample_size1)
                sample_size2= leaf_handler(dict2,length_list2,sample_size2)
                sample_size1= main_node_handler(dict1,length_list1,sample_size1,keys1)
                sample_size2= main_node_handler(dict2,length_list2,sample_size2,keys2)

        
        
                data_points_1= get_data_points(length_list1)
                data_points_2= get_data_points(length_list2)



                if(new_ancs1 != ""){



                    const index1 = data_points_1.indexOf(len1_excluded);
                    if (index1 > -1) {
                      data_points_1.splice(index1, 1);
                    }

                }

                if(new_ancs2 != ""){

                    const index2 = data_points_2.indexOf(len2_excluded);
                    if (index2 > -1) {
                      data_points_2.splice(index2, 1);
                    }


                }
                




                
             temp_leaves3=[]
            temp_leaves4=[]

            for (let m=0; m<data_points_1.length; m++){

                str=""
                dis= data_points_1[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves3.push(tmp)
            }

            for (let m=0; m<data_points_2.length; m++){

                str=""
                dis= data_points_2[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves4.push(tmp)
            }

            
            
   
            
            all_lengths_2=[]
            
            for(i=0; i<temp_leaves3.length; i++){
                
                temp_leaves3[i].From = "A"
                all_lengths_2.push(temp_leaves3[i])

            }

            for(i=0; i<temp_leaves4.length; i++){
                
                temp_leaves4[i].From = "B"
                all_lengths_2.push(temp_leaves4[i])

            }

            // kucukten buyuge siraliyor
            all_lengths_sorted2 = all_lengths_2.sort((first, second) => first.Distance - second.Distance)
            
            for (i=0;i<all_lengths_sorted2.length;i++){
                
                all_lengths_sorted2[i].rank = i+1
              
            }

            // Ali Parlakci implementation

            for (let i = 0; i < all_lengths_sorted2.length;) {
                let occurence = 1;
                while ((i + occurence < all_lengths_sorted2.length) && (all_lengths_sorted2[i].Distance == all_lengths_sorted2[i+occurence].Distance)) {
                    occurence++;
                }


                ranks = 0;
                for (let j = i; j < i + occurence; j++) {
                    ranks += all_lengths_sorted2[j].rank;
                }

                for (let j = i; j < i + occurence; j++) {
                    all_lengths_sorted2[j].rank = ranks / occurence;
                }

                i += occurence;
            }
            
            // Ali Parlakci implementation

            n3= temp_leaves3.length
            n4= temp_leaves4.length
            rank_sum3=0
            rank_sum4=0

            for (i=0;i<all_lengths_sorted2.length;i++){

                if (all_lengths_sorted2[i].From == "A"){


                    rank_sum3+=all_lengths_sorted2[i].rank
                }


                if (all_lengths_sorted2[i].From == "B"){


                    rank_sum4+=all_lengths_sorted2[i].rank
                }

            }

            u1_second= n3*n4+ (n3*(n3+1))/2 - rank_sum3
            u2_second=n3*n4+ (n4*(n4+1))/2 - rank_sum4

            if (u1_second > u2_second){

                main_u2= u2_second
            }

            else {

                main_u2= u1_second
            }

                z_score_top2 = main_u2-(n3*n4)/2
                z_score_bottom2= (n3*n4)*(n3+n4+1)/12
                z_score_2= z_score_top2/Math.sqrt(z_score_bottom2)          
                p_val_mann_whitney2=jStat.ztest(z_score_2,2)

                document.getElementById("p_val_mann_whitney2").value = p_val_mann_whitney2
                document.getElementById("z_score_2").value = z_score_2
                document.getElementById("p_val_mann_whitney1").value = p_val_mann_whitney1
                document.getElementById("z_score").value = z_score


            }
            
             else{ // if regex does not entered

                dict1={}
                dict2={}
                call_tree(clade_1_json,dict1)
                call_tree(clade_2_json,dict2)
                eliminate_dict(dict1, leavesOneDist)
                eliminate_dict(dict2, leavesTwoDist)
                data_points_1=[]
                data_points_2=[]

            let keys1 = Object.keys(dict1).filter(el=>dict1[el].length === 5).sort((first,second)=>dict1[first][2]-dict1[second][2])
            let keys2 = Object.keys(dict2).filter(el=>dict2[el].length === 5).sort((first,second)=>dict2[first][2]-dict2[second][2])

            ancs1_ID= keys1[keys1.length-1]
            ancs2_ID= keys2[keys2.length-1]


            key_list= Object.keys(dict1)

            for (let i=0; i<key_list.length; i++){

                if (key_list[i]==ancs1_ID){

                    continue
                }

                var elements = dict1[key_list[i]]

                if (elements.length == 3){ // Only leaves

    
                       data_points_1.push(elements[2]) 
                        
                 }
                    

                else{


                     data_points_1.push(elements[1]) 
                }
          } 

           key_list= Object.keys(dict2)

            for (let i=0; i<key_list.length; i++){

                if (key_list[i]==ancs2_ID){

                    continue
                }

                var elements = dict2[key_list[i]]

                if (elements.length == 3){ // Only leaves

    
                       data_points_2.push(elements[2]) 
                        
                 }
                    

                else{


                     data_points_2.push(elements[1]) 
                }
          }


          temp_leaves3=[]
            temp_leaves4=[]

            for (let m=0; m<data_points_1.length; m++){

                str=""
                dis= data_points_1[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves3.push(tmp)
            }

            for (let m=0; m<data_points_2.length; m++){

                str=""
                dis= data_points_2[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves4.push(tmp)
            }

            
            
   
            
            all_lengths_2=[]
            
            for(i=0; i<temp_leaves3.length; i++){
                
                temp_leaves3[i].From = "A"
                all_lengths_2.push(temp_leaves3[i])

            }

            for(i=0; i<temp_leaves4.length; i++){
                
                temp_leaves4[i].From = "B"
                all_lengths_2.push(temp_leaves4[i])

            }

            // kucukten buyuge siraliyor
            all_lengths_sorted2 = all_lengths_2.sort((first, second) => first.Distance - second.Distance)
            
            for (i=0;i<all_lengths_sorted2.length;i++){
                
                all_lengths_sorted2[i].rank = i+1
              
            }

            // Ali Parlakci implementation

            for (let i = 0; i < all_lengths_sorted2.length;) {
                let occurence = 1;
                while ((i + occurence < all_lengths_sorted2.length) && (all_lengths_sorted2[i].Distance == all_lengths_sorted2[i+occurence].Distance)) {
                    occurence++;
                }


                ranks = 0;
                for (let j = i; j < i + occurence; j++) {
                    ranks += all_lengths_sorted2[j].rank;
                }

                for (let j = i; j < i + occurence; j++) {
                    all_lengths_sorted2[j].rank = ranks / occurence;
                }

                i += occurence;
            }
            
            // Ali Parlakci implementation

            n3= temp_leaves3.length
            n4= temp_leaves4.length
            rank_sum3=0
            rank_sum4=0

            for (i=0;i<all_lengths_sorted2.length;i++){

                if (all_lengths_sorted2[i].From == "A"){


                    rank_sum3+=all_lengths_sorted2[i].rank
                }


                if (all_lengths_sorted2[i].From == "B"){


                    rank_sum4+=all_lengths_sorted2[i].rank
                }

            }

            u1_second= n3*n4+ (n3*(n3+1))/2 - rank_sum3
            u2_second=n3*n4+ (n4*(n4+1))/2 - rank_sum4

            if (u1_second > u2_second){

                main_u2= u2_second
            }

            else {

                main_u2= u1_second
            }

            z_score_top2 = main_u2-(n3*n4)/2
            z_score_bottom2= (n3*n4)*(n3+n4+1)/12
            z_score_2= z_score_top2/Math.sqrt(z_score_bottom2)          
            p_val_mann_whitney2=jStat.ztest(z_score_2,2)
                
            document.getElementById("p_val_mann_whitney2").value = p_val_mann_whitney2
            document.getElementById("z_score_2").value = z_score_2
            document.getElementById("p_val_mann_whitney1").value = p_val_mann_whitney1
            document.getElementById("z_score").value = z_score
 

        }

           

            boxPlotLeaves(data_points_1, data_points_2)
            
             
            // Partially Overlapping implementation
            
          
            leave_one_before_regex_distances=[]
            for (i=0; i<leaves_one_before_regex_dist.length; i++){

                leave_one_before_regex_distances.push(leaves_one_before_regex_dist[i].Distance)
            }

            leave_two_before_regex_distances=[]
            for (i=0; i<leaves_two_before_regex_dist.length; i++){

                leave_two_before_regex_distances.push(leaves_two_before_regex_dist[i].Distance)
            }
            
            
            

            x1_po= jStat.mean(leave_one_before_regex_distances)
            x2_po= jStat.mean(leave_two_before_regex_distances)
            n1_po= leave_one_before_regex_distances.length
            n2_po= leave_two_before_regex_distances.length
            nc= global_common.length
            na= n1_po - nc 
            nb= n2_po - nc
                
            sum1=0
                
            for (let m=0; m<leave_one_before_regex_distances.length;m++){
                
                temp=0
                temp= x1_po-leave_one_before_regex_distances[m]
                temp_s= temp*temp
                sum1+=temp_s
            }

            stev1= sum1/(n1_po-1)
            stev1= Math.sqrt(stev1)

            sum2=0
                
            for (let m=0; m<leave_two_before_regex_distances.length;m++){
                
                temp=0
                temp= x2_po-leave_two_before_regex_distances[m]
                temp_s= temp*temp
                sum2+=temp_s
            }

            stev2= sum2/(n2_po-1)
            stev2= Math.sqrt(stev2)


            r=0
           
            difference1=[]
            difference2=[]
            r_sum1=[]
            r_sum2=[]

            up_part=0
            left_down=0
            right_down=0
            
            for (k=0; k<global_common.length; k++){

         
                target= global_common[k]


                for (i=0; i<leaves_one_before_regex_dist.length ; i++){

                    target_name= leaves_one_before_regex_dist[i].From


                    if (target_name.indexOf(target) != -1){

                           r_sum1.push(leaves_one_before_regex_dist[i].Distance)
                  
                           break
                    }
                 
               }

               for (i=0; i<leaves_two_before_regex_dist.length ; i++){


                   if ((leaves_two_before_regex_dist[i].From).indexOf(target) != -1){

                        r_sum2.push(leaves_two_before_regex_dist[i].Distance)
                        break

                   }

                }
            }
            
            rmean1= jStat.mean(r_sum1)
            rmean2= jStat.mean(r_sum2)
            

            for (k=0; k<global_common.length; k++){

                one_find=0
                two_find=0
                target= global_common[k]


                for (i=0; i<leaves_one_before_regex_dist.length ; i++){

                    target_name= leaves_one_before_regex_dist[i].From


                    if (target_name.indexOf(target) != -1){

                           one_find=leaves_one_before_regex_dist[i].Distance-rmean1
                           wanted_diff= one_find*one_find
                           left_down+=wanted_diff
                           break
                    }
                 
                }

               for (i=0; i<leaves_two_before_regex_dist.length ; i++){


                   if ((leaves_two_before_regex_dist[i].From).indexOf(target) != -1){

                        two_find=leaves_two_before_regex_dist[i].Distance-rmean2
                        wanted_diff= two_find*two_find
                        right_down+=wanted_diff
                        break

                   }

                }

                up_part+=(one_find*two_find)

            }

            r= up_part/ Math.sqrt(left_down*right_down)
            sp_up= ((n1_po-1)*stev1*stev1)+((n2_po-1)*stev2*stev2)
            sp_down= (n1_po-1)+(n2_po-1)
            sp= Math.sqrt(sp_up/sp_down)
            m=stev1*stev1/n1_po
            t_po1=(x1_po-x2_po)/(Math.sqrt(m + (stev2*stev2/n2_po)- (2*r*stev1*stev2*nc/(n1_po*n2_po))))
            weird1= ((stev1*stev1/n1_po)+ (stev2*stev2/n2_po))*((stev1*stev1/n1_po)+ (stev2*stev2/n2_po))/ ((stev1*stev1/n1_po)*(stev1*stev1/n1_po)/(n1_po-1) + (stev2*stev2/n2_po)*(stev2*stev2/n2_po)/(n2_po-1) ) 
            df_po1= (nc-1) + (weird1-nc+1)/(na+nb+2*nc)*(na+nb)
            pval_po1= jStat.ttest(t_po1, df_po1, 2)
            
            

          
            
            if(bool==false){ 

            document.getElementById("pval_po1").value = pval_po1
            document.getElementById("t_po1").value = t_po1
            
            }
            
            
          
            
        }
        else { //beginning_tree
            
               for (i = 0; i < leavesOne.length; i++) {
                distance = 0
                temp = leavesOne[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leavesOne[i].name,
                    Distance: distance
                }
                leavesOneDist.push(tmp)
            }
            for (i = 0; i < leavesTwo.length; i++) {
                distance = 0
                temp = leavesTwo[i]
                while (temp != ancs) {
                    distance += temp.length
                    temp = temp.parent
                }
                var tmp = {
                    From: leavesTwo[i].name,
                    Distance: distance
                }
                leavesTwoDist.push(tmp)

            }
            
           clade_1_json= multiSelected[0]
            clade_2_json= multiSelected[1]

            dict1={}
                dict2={}
                call_tree(clade_1_json,dict1)
                call_tree(clade_2_json,dict2)
                eliminate_dict(dict1, leavesOneDist)
                eliminate_dict(dict2, leavesTwoDist)
                data_points_1=[]
                data_points_2=[]

              let keys1 = Object.keys(dict1).filter(el=>dict1[el].length === 5).sort((first,second)=>dict1[first][2]-dict1[second][2])
            let keys2 = Object.keys(dict2).filter(el=>dict2[el].length === 5).sort((first,second)=>dict2[first][2]-dict2[second][2])

            ancs1_ID= keys1[keys1.length-1]
            ancs2_ID= keys2[keys2.length-1]


            key_list= Object.keys(dict1)

            for (let i=0; i<key_list.length; i++){

                if (key_list[i]==ancs1_ID){

                    continue
                }

                var elements = dict1[key_list[i]]

                if (elements.length == 3){ // Only leaves

    
                       data_points_1.push(elements[2]) 
                        
                 }
                    

                else{


                     data_points_1.push(elements[1]) 
                }
          } 

           key_list= Object.keys(dict2)

            for (let i=0; i<key_list.length; i++){

                if (key_list[i]==ancs2_ID){

                    continue
                }

                var elements = dict2[key_list[i]]

                if (elements.length == 3){ // Only leaves

    
                       data_points_2.push(elements[2]) 
                        
                 }
                    

                else{


                     data_points_2.push(elements[1]) 
                }
          }


          temp_leaves3=[]
            temp_leaves4=[]

            for (let m=0; m<data_points_1.length; m++){

                str=""
                dis= data_points_1[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves3.push(tmp)
            }

            for (let m=0; m<data_points_2.length; m++){

                str=""
                dis= data_points_2[m]
                rank=0
                var tmp = {
                        From: str,
                        Distance: dis,
                        rank:rank
                }
                temp_leaves4.push(tmp)
            }

            
            
   
            
            all_lengths_2=[]
            
            for(i=0; i<temp_leaves3.length; i++){
                
                temp_leaves3[i].From = "A"
                all_lengths_2.push(temp_leaves3[i])

            }

            for(i=0; i<temp_leaves4.length; i++){
                
                temp_leaves4[i].From = "B"
                all_lengths_2.push(temp_leaves4[i])

            }

            // kucukten buyuge siraliyor
            all_lengths_sorted2 = all_lengths_2.sort((first, second) => first.Distance - second.Distance)
            
            for (i=0;i<all_lengths_sorted2.length;i++){
                
                all_lengths_sorted2[i].rank = i+1
              
            }

            // Ali Parlakci implementation

            for (let i = 0; i < all_lengths_sorted2.length;) {
                let occurence = 1;
                while ((i + occurence < all_lengths_sorted2.length) && (all_lengths_sorted2[i].Distance == all_lengths_sorted2[i+occurence].Distance)) {
                    occurence++;
                }


                ranks = 0;
                for (let j = i; j < i + occurence; j++) {
                    ranks += all_lengths_sorted2[j].rank;
                }

                for (let j = i; j < i + occurence; j++) {
                    all_lengths_sorted2[j].rank = ranks / occurence;
                }

                i += occurence;
            }
            
            // Ali Parlakci implementation

            n3= temp_leaves3.length
            n4= temp_leaves4.length
            rank_sum3=0
            rank_sum4=0

            for (i=0;i<all_lengths_sorted2.length;i++){

                if (all_lengths_sorted2[i].From == "A"){


                    rank_sum3+=all_lengths_sorted2[i].rank
                }


                if (all_lengths_sorted2[i].From == "B"){


                    rank_sum4+=all_lengths_sorted2[i].rank
                }

            }

            u1_second= n3*n4+ (n3*(n3+1))/2 - rank_sum3
            u2_second=n3*n4+ (n4*(n4+1))/2 - rank_sum4

            if (u1_second > u2_second){

                main_u2= u2_second
            }

            else {

                main_u2= u1_second
            }

            z_score_top2 = main_u2-(n3*n4)/2
            z_score_bottom2= (n3*n4)*(n3+n4+1)/12
            z_score_2= z_score_top2/Math.sqrt(z_score_bottom2)          
            p_val_mann_whitney2=jStat.ztest(z_score_2,2)
                
            document.getElementById("p_val_mann_whitney2").value = p_val_mann_whitney2
            document.getElementById("z_score_2").value = z_score_2
         
         

             temp_leaves=leavesOneDist
                temp_leaves2=leavesTwoDist
                all_lengths_1=[]
                for(i=0; i<temp_leaves.length; i++){

                    temp_leaves[i].where = "A"
                    all_lengths_1.push(temp_leaves[i])

                }

                for(i=0; i<temp_leaves2.length; i++){

                    temp_leaves2[i].where = "B"
                    all_lengths_1.push(temp_leaves2[i])

                }

                // kucukten buyuge siraliyor
                all_lengths_sorted = all_lengths_1.sort((first, second) => first.Distance - second.Distance)

                for (i=0;i<all_lengths_sorted.length;i++){

                    all_lengths_sorted[i].rank = i+1

                }

                // Ali Parlakci implementation.

                for (let i = 0; i < all_lengths_sorted.length;) {
                    let occurence = 1;
                    while ((i + occurence < all_lengths_sorted.length) && (all_lengths_sorted[i].Distance == all_lengths_sorted[i+occurence].Distance)) {
                        occurence++;
                    }


                    ranks = 0;
                    for (let j = i; j < i + occurence; j++) {
                        ranks += all_lengths_sorted[j].rank;
                    }

                    for (let j = i; j < i + occurence; j++) {
                        all_lengths_sorted[j].rank = ranks / occurence;
                    }

                    i += occurence;
                }

                // Ali Parlakci implementation

                n1= temp_leaves.length
                n2= temp_leaves2.length
                rank_sum1=0
                rank_sum2=0

                for (i=0;i<all_lengths_sorted.length;i++){

                    if (all_lengths_sorted[i].where == "A"){


                        rank_sum1+=all_lengths_sorted[i].rank
                    }


                    if (all_lengths_sorted[i].where == "B"){


                        rank_sum2+=all_lengths_sorted[i].rank
                    }

                }

                u1_first= n1*n2+ (n1*(n1+1))/2 - rank_sum1
                u2_first=n1*n2+ (n2*(n2+1))/2 - rank_sum2

                if (u1_first> u2_first){

                    main_u= u2_first
                }

                else {

                    main_u= u1_first
                }

                z_score_top = main_u-(n1*n2)/2
                z_score_bottom= (n1*n2)*(n1+n2+1)/12
                z_score= z_score_top/Math.sqrt(z_score_bottom)          
                p_val_mann_whitney1=jStat.ztest(z_score,2)
             document.getElementById("p_val_mann_whitney1").value = p_val_mann_whitney1
            document.getElementById("z_score").value = z_score
 

            boxPlotEachOther(leavesOneDist, leavesTwoDist)

            turn = 0
            count = 0
            end = (leavesOne.length) * (leavesOne.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leavesOne.length; i++) {
                    str = leavesOne[turn].name + "---" + leavesOne[i].name
                    dis = leavesOne[turn].length + leavesOne[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesOneEachother.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }
            turn = 0
            count = 0
            end = (leavesTwo.length) * (leavesTwo.length - 1) / 2
            while (true) {
                for (i = turn + 1; i < leavesTwo.length; i++) {
                    str = leavesTwo[turn].name + "---" + leavesTwo[i].name
                    dis = leavesTwo[turn].length + leavesTwo[i].length
                    var tmp = {
                        Between: str,
                        Distance: dis
                    }
                    leavesTwoEachother.push(tmp)
                    count += 1
                }
                turn += 1
                if (count == end) {
                    break
                }
            }

            boxPlotLeaves(data_points_1, data_points_2)
        

        

        }

    }

    function findDist(leafOne, leafTwo) {
        parentOne = leafOne
        parentTwo = leafTwo
        check = true
        for (i = 0; i <= leafOne.depth; i++) {
            parentTwo = leafTwo
            for (j = 0; j <= leafTwo.depth; j++) {
                if (parentOne.ID == parentTwo.ID) {
                    st = parentOne
                    check = false
                    break
                }
                if (parentTwo.depth != 0) {
                    parentTwo = parentTwo.parent
                }
            }
            if (check == false) {
                break
            }
            else {
                if (parentOne.depth != 0) {
                    parentOne = parentOne.parent
                }
            }
        }

        dist1 = 0
        tempOne = leafOne
        for (i = 0; i < leafOne.depth - st.depth; i++) {
            dist1 += tempOne.length;
            tempOne = tempOne.parent
        }
        dist2 = 0
        tempTwo = leafTwo
        for (i = 0; i < leafTwo.depth - st.depth; i++) {
            dist2 += tempTwo.length;
            tempTwo = tempTwo.parent
        }

        if (dist1 >= dist2) return 1
        else if (dist1 < dist2) return 2
    }
    
    global_common=[]
    regex_global= /.*/i
    clade_1_json= multiSelected[0]
    clade_2_json= multiSelected[1]

    function regexSearch(beginning) {
        if (multiSelected[0] && multiSelected[1]) {
            var i;
            if (document.getElementById('regExSearch').value) {
                var regTemp = document.getElementById('regExSearch').value
                var regex = new RegExp(regTemp, "i");
                regex_global= new RegExp(regTemp, "g")
            }
            else {
                var regex = /.*/i;
            }
            var one = []
            var two = []
            var regOne = [], regTwo = []
            leavesOne = multiSelected[0].leaves
            leavesTwo = multiSelected[1].leaves
            for (i = 0; i < leavesOne.length; i++) {
                if (leavesOne[i].name.match(regex)) {
                    temp = leavesOne[i].name.match(regex)[0]
                    if (one.includes(temp)) {
                        index = leavesOne.findIndex(x => x.name == leavesOne[i].name.match(regex)['input'])
                        oneIndex = one.indexOf(temp)
                        if (findDist(leavesOne[i], leavesOne[index]) == 1) {
                            one[oneIndex] = temp
                            regOne[oneIndex] = leavesOne[i]
                        }
                        else if (findDist(leavesOne[i], leavesOne[index]) == 2) {
                            one[oneIndex] = temp
                            regOne[oneIndex] = leavesOne[index]
                        }
                    }
                    else {
                        one.push(leavesOne[i].name.match(regex)[0])
                        regOne.push(leavesOne[i])
                    }
                }
            }

            for (i = 0; i < leavesTwo.length; i++) {
                if (leavesTwo[i].name.match(regex)) {
                    temp = leavesTwo[i].name.match(regex)[0]
                    if (two.includes(temp)) {
                        index = leavesTwo.findIndex(x => x.name == leavesTwo[i].name.match(regex)['input'])
                        twoIndex = two.indexOf(temp)
                        if (findDist(leavesTwo[i], leavesTwo[index]) == 1) {
                            two[twoIndex] = temp
                            regTwo[twoIndex] = leavesTwo[i]
                        }
                        else if (findDist(leavesTwo[i], leavesTwo[index]) == 2) {
                            two[twoIndex] = temp
                            regTwo[twoIndex] = leavesTwo[index]
                        }
                    }
                    else {
                        two.push(leavesTwo[i].name.match(regex)[0])
                        regTwo.push(leavesTwo[i])
                    }
                }
            }
            
            var common = [];
            for (i = 0; i < one.length; i++) {
                for (j = 0; j < two.length; j++) {
                    if (one[i] == two[j]) {
                        common.push(one[i])
                        var indexOne = one.indexOf(one[i]);
                        one.splice(indexOne, 1);
                        i--;
                        var indexTwo = two.indexOf(two[j]);
                        two.splice(indexTwo, 1);
                        j--;
                    }
                }
            }
            
            global_common=common
            
            
                        

            // Elif's paired test 
            
            paired_t=""
            pval_paired=""
            
            // If there is any regex given, it calculates the paired t-test if there is not paired values equaled to N/A.
            if (regex != "/.*/i"){ 

                each_diff=[]

                overall_diff=0

                for (i=0;i<common.length;i++){

                    one_diff=0
                    two_diff=0

                    for (j=0;j<leavesOneDist.length;j++){


                        if ((leavesOneDist[j].From).includes(common[i])){

                            one_diff=leavesOneDist[i].Distance
                            break
                        }

                    }

                    for (a=0;a<leavesTwoDist.length;a++){


                        if((leavesTwoDist[a].From).includes(common[i])){

                            two_diff=leavesTwoDist[i].Distance
                            break

                         }
                    }


                    diff= two_diff-one_diff
                    each_diff.push(diff)
                    overall_diff+=diff
                }

                X_d= overall_diff/common.length
                up=0
                for (i=0; i<each_diff.length;i++){

                    sol=0
                    temp_n=each_diff[i]-X_d
                    sol=temp_n*temp_n
                    up+=sol

                }

                sd_prev= up/((common.length)-1)
                sd = Math.sqrt(sd_prev)
                sample_size=common.length
                mean_zero=0 // Don't know what to put now
                paired_t= (X_d-mean_zero)/(sd/Math.sqrt(sample_size))
                pval_paired = jStat.ttest(paired_t, sample_size, 2)
                document.getElementById("paired_t").value = paired_t
                document.getElementById("pval_paired").value = pval_paired
                
            }
            
            
            else {

                paired_t="N/A"
                pval_paired="N/A"
                document.getElementById("paired_t").value = paired_t
                document.getElementById("pval_paired").value = pval_paired
            }
            
        
            
            bool= false
            
            if (regex == "/.*/i" || !regex){ 

                bool = true 
               
                //p_val_mann_whitney2="N/A"
                //z_score_2="N/A"
                //p_val_mann_whitney1="N/A"
                //z_score="N/A"
                pval_po1="N/A"
                t_po1="N/A"
             
                
                //document.getElementById("p_val_mann_whitney2").value = p_val_mann_whitney2
                //document.getElementById("z_score_2").value = z_score_2
                //document.getElementById("p_val_mann_whitney1").value = p_val_mann_whitney1
                //document.getElementById("z_score").value = z_score
                document.getElementById("pval_po1").value = pval_po1
                document.getElementById("t_po1").value = t_po1
            
              
            }

            else {

               
               
            }
         
     
            
            var resSearch = {
                searchOne: one.concat(common),
                numSearchOne: one.concat(common).length,
                searchTwo: two.concat(common),
                numSearchTwo: two.concat(common).length,
                searchCommon: common,
                numSearchCommon: common.length,
                searchOnlyOne: one,
                numSearchOnlyOne: one.length,
                searchOnlyTwo: two,
                numSearchOnlyTwo: two.length
            }

            var regSearch = {
                searchOne: regOne,
                searchTwo: regTwo
            }
            /*if (def) {
                console.log(resSearch)
            }*/
            var str = "Number of species in the first clade: " + resSearch.numSearchOne.toString() +
                "\nNumber of species in the second clade: " + resSearch.numSearchTwo.toString() +
                "\nNumber of species in both of the clades: " + resSearch.numSearchCommon.toString() +
                "\nNumber of unique species in first clade: " + resSearch.numSearchOnlyOne.toString() +
                "\nNumber of unique species in second clade: " + resSearch.numSearchOnlyTwo.toString()


            document.getElementById("regRes").value = str
            plotVenn(resSearch)
            if (beginning) {
                return resSearch
            }
            else {
                commonAncestor(regSearch)
            }
        }
        else {
            document.getElementById("regRes").value = ""
            plotVenn(null)
            if (beginning) {
                return null
            }
            commonAncestor()
        }
    }

    function plotVenn(resSearch) {
        if (resSearch == null) {
            A = 0
            B = 0
            AB = 0
            chart = Highcharts.chart('regExVenn', {
                series: [{
                }],
                title: {
                    text: 'Search Results'
                }
            });
            chart
            chart.destroy();
        }
        else {

            A = resSearch.searchOne.length
            B = resSearch.searchTwo.length
            AB = resSearch.searchCommon.length

            chart = Highcharts.chart('regExVenn', {
                series: [{
                    type: 'venn',
                    name: 'Search Results',
                    // Series data
                    data: [{
                        name: nameObj.node1,
                        sets: ['A'],
                        value: A,
                        color: colorObj.color1
                    }, {
                        name: nameObj.node2,
                        sets: ['B'],
                        value: B,
                        color: colorObj.color2
                    }, {
                        name: 'Intersection of Both',
                        sets: ['A', 'B'],
                        value: AB,
                        color: "white"
                    }]
                }],
                title: {
                    text: 'Search Results'
                }
            });
            chart
            chartSVG = chart.getSVG()
        }
    }

    function createTreeDownload(canvasId, downloadClass) {

        function buildDownloadButton(canvasId, downloadClass) {

            var downloadButton = d3.select("#" + canvasId).select("." + downloadClass).append("div")
                .attr("class", "btn-group export-group");
            downloadButton.append("button")
                .attr("id", "exportButton")
                .attr("class", "btn btn-sm sharp nwk")
                .attr("title", "export tree as nwk string")
                .attr("type", "button")
                .append("span")
                .text("nwk");
            downloadButton.append("button")
                .attr("id", "exportButton")
                .attr("class", "btn btn-sm sharp svg")
                .attr("title", "export tree as svg")
                .attr("type", "button")
                .append("span")
                .text("svg");
            downloadButton.append("button")
                .attr("id", "exportButton")
                .attr("class", "btn btn-sm sharp png")
                .attr("title", "export tree as png")
                .attr("type", "button")
                .append("span")
                .text("png");
        }

        //var width = 300, height = 300;
        // draws download buttons
        if (settings.enableDownloadButtons) {

            // draw button
            buildDownloadButton(canvasId, downloadClass);

            // PNG
            d3.select("#" + canvasId).select(".png")
                .on('click', function () {
                    var svg = d3.select("#" + canvasId + " > svg");
                    addLogo(svg);
                    var name = svg.attr("id");
                    var svgString = getSVGString(svg.node());
                    var exportElement = svg.node();
                    var width = exportElement.getBoundingClientRect().width;
                    var height = exportElement.getBoundingClientRect().height;
                    svgString2Image(svgString, 2 * width, 2 * height, 'png', save);
                    function save(dataBlob, filesize) {
                        var filename = (name) ? name + "." : "";
                        saveAs(dataBlob, filename + 'phylo.io.png'); // FileSaver.js function
                    }
                    svg.select("#exportLogo").remove();
                });

            // SVG
            d3.select("#" + canvasId).select(".svg")
                .on("click", function () {
                    var svg = d3.select("#" + canvasId + " svg");
                    addLogo(svg);
                    //console.log(svg)
                    var name = svg.attr("id");
                    var svgString = getSVGString(svg.node());
                    var blob = new Blob([svgString], { "type": "image/svg+xml;base64," + btoa(svgString) });
                    saveAs(blob, name + ".svg");
                    svg.select("#exportLogo").remove();
                });

            // NWK
            d3.select("#" + canvasId).select(".nwk")
                .on("click", function () {
                    var name = d3.select("#" + canvasId + " svg").attr("id");
                    var tree = trees[findTreeIndex(name)];
                    var nwkString = tree2Newick(tree.root);
                    var blob = new Blob([nwkString], { "type": "text/plain;charset=utf-8," + encodeURIComponent(nwkString) });
                    saveAs(blob, "phylo.io.nwk");
                });


            // Below are the functions that handle actual exporting:
            // getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
            // Function taken from http://bl.ocks.org/Rokotyan/0556f8facbaf344507cdc45dc3622177
            /*
                        function getSVGString( svgNode ) {
                            svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
                            //var cssStyleText = getCSSStyles( svgNode );
                            // appendCSS( cssStyleText, svgNode );
            
                            var serializer = new XMLSerializer();
                            var svgString = serializer.serializeToString(svgNode);
                            svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
                            svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
            
                            return svgString;
            
                        }
            */

            // Below are the functions that handle actual exporting:
            // getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
            function getSVGString(svgNode) {
                svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
                //var cssStyleText = getCSSStyles( svgNode );
                //appendCSS( cssStyleText, svgNode );

                var serializer = new XMLSerializer();
                var svgString = serializer.serializeToString(svgNode);
                svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
                svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

                return svgString;

                function getCSSStyles(parentElement) {
                    var selectorTextArr = [];

                    // Add Parent element Id and Classes to the list
                    selectorTextArr.push('#' + parentElement.id);
                    for (var c = 0; c < parentElement.classList.length; c++)
                        if (!contains('.' + parentElement.classList[c], selectorTextArr))
                            selectorTextArr.push('.' + parentElement.classList[c]);

                    // Add Children element Ids and Classes to the list
                    var nodes = parentElement.getElementsByTagName("*");
                    for (var i = 0; i < nodes.length; i++) {
                        var id = nodes[i].id;
                        if (!contains('#' + id, selectorTextArr))
                            selectorTextArr.push('#' + id);

                        var classes = nodes[i].classList;
                        for (var c = 0; c < classes.length; c++)
                            if (!contains('.' + classes[c], selectorTextArr))
                                selectorTextArr.push('.' + classes[c]);
                    }

                    // Extract CSS Rules
                    var extractedCSSText = "";
                    for (var i = 0; i < document.styleSheets.length; i++) {
                        var s = document.styleSheets[i];

                        try {
                            if (!s.cssRules) continue;
                        } catch (e) {
                            if (e.name !== 'SecurityError') throw e; // for Firefox
                            continue;
                        }

                        var cssRules = s.cssRules;
                        for (var r = 0; r < cssRules.length; r++) {
                            if (contains(cssRules[r].selectorText, selectorTextArr))
                                extractedCSSText += cssRules[r].cssText;
                        }
                    }


                    return extractedCSSText;

                    function contains(str, arr) {
                        return arr.indexOf(str) === -1 ? false : true;
                    }

                }

                function appendCSS(cssText, element) {
                    var styleElement = document.createElement("style");
                    styleElement.setAttribute("type", "text/css");
                    styleElement.innerHTML = cssText;
                    var refNode = element.hasChildNodes() ? element.children[0] : null;
                    element.insertBefore(styleElement, refNode);
                }
            }

            function svgString2Image(svgString, width, height, format, callback) {
                var format = format ? format : 'png';

                var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString))); // Convert SVG string to dataurl

                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");

                canvas.width = width;
                canvas.height = height;

                var image = new Image;
                image.onload = function () {

                    context.clearRect(0, 0, width, height);
                    context.fillStyle = "#ffffff";
                    context.fillRect(0, 0, width, height);
                    context.drawImage(image, 0, 0, width, height);

                    canvas.toBlob(function (blob) {
                        var filesize = Math.round(blob.length / 1024) + ' KB';
                        if (callback) callback(blob, filesize);
                    });
                };
                image.src = imgsrc;
            }

        }

    }

    function createZoomSlider(canvasId, zoomClass, baseTree) {
        var name = baseTree.name;
        //renders the manual zoom slider if turned on
        if (settings.enableZoomSliders) {
            d3.select("#" + canvasId).select("." + zoomClass).append("div")
                .attr("class", "zoomSliderContainer")
                .append("input")
                .attr("type", "range")
                .attr("class", "zoomSlider")
                .attr("id", "zoomSlider" + findTreeIndex(name))
                .attr("min", "0.05")
                .attr("max", "5")
                .attr("value", "1.00")
                .attr("step", "0.01");
        }
    }

    // helper function to set up canvas to place the tree inside
    function initializeRenderTreeCanvas(name, canvasId, scaleId, otherTreeName) {

        //get the trees by name
        var baseTree = trees[findTreeIndex(name)];
        if (otherTreeName !== undefined) {
            compareMode = true;
        }
        // renderedTrees.push(baseTree);

        //clear the canvas of any previous visualisation
        $("#" + canvasId).empty();
        jQuery.extend(baseTree.data, {
            canvasId: canvasId
        });

        if (scaleId && settings.enableScale) {
            $("#" + scaleId).empty();
            jQuery.extend(baseTree.data, {
                scaleId: scaleId
            });
        }
    }

    /*---------------
     /
     /    Main function for setting up a d3 visualisation of a tree
     /
     ---------------*/
    function renderTree(baseTree, name, canvasId, scaleId, otherTreeName, treeToggle) {
        for (i = 0; i <= multiSelected.length; i++) {
            multiSelected.pop();
        }
        //get the trees by name
        if (otherTreeName !== undefined) {
            compareMode = true;
        } else {
            compareMode = false;
        }

        renderedTrees.push(baseTree);

        $("#" + canvasId + " .treeTools").remove();
        $("#" + canvasId + " .treeToolsMenu").remove();
        $("#" + canvasId + " .exportTools").remove();
        $("#" + canvasId + " .undo").remove();
        $("#" + canvasId + " .searchBox").remove();
        $("#" + canvasId + " .rescaleButtons").remove();
        $("#" + canvasId + " .zoomSlider").remove();

        createLeafSearch(canvasId, name);
        createToolbar(canvasId, baseTree, compareMode);
        createExportBar(canvasId);
        // createShareButton(canvasId);
        createUndoButton(canvasId);
        //renderSearchBar(canvasId, baseTree);

        //clear the canvas of any previous visualisation
        if (scaleId && settings.enableScale) {
            $("#" + scaleId).empty();
            scaleId = "#" + scaleId;
        }

        //set up the d3 vis
        var width = $("#" + canvasId).width();
        var height = $("#" + canvasId).height();
        var tree = d3.layout.tree()
            .size([height, width]);

        var svg = d3.select("#" + canvasId).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("version", "1.1")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("id", name)
            .append("g");

        // defines the zoom behaviour
        var zoomBehaviour = d3.behavior.zoom()
            .scaleExtent([settings.scaleMin, settings.scaleMax])
            .on("zoom", zoom);

        var zoomBehaviourSemantic = d3.behavior.zoom()
            .on("zoom", semanticZoom);

        $(".zoomSlider").attr("min", settings.scaleMin);
        $(".zoomSlider").attr("max", settings.scaleMax);

        //choose which zoom event to call depending on current zoom mode
        if (settings.zoomMode === "traditional") {
            d3.select("#" + canvasId + " svg")
                .call(zoomBehaviour);
        } else if (settings.zoomMode === "semantic") {
            d3.select("#" + canvasId + " svg")
                .call(zoomBehaviourSemantic);
        }
        var root = baseTree.root;
        root.x0 = height / 2;
        root.y0 = 0;

        //render the scale if we have somewhere to put it
        if (scaleId && settings.enableScale) {
            var translatewidth = 100;
            // TODO magic number?
            var translateheight = height - 100;

            d3.select("#" + canvasId + " svg")
                .append("g")
                .attr("transform", "translate(" + translatewidth + "," + translateheight + ")")
                .append("path")
                .attr("d", function () {
                    scaleLineWidth = width * 0.25;
                    return "M" + scaleLinePadding + ",20L" + (scaleLineWidth + scaleLinePadding) + ",20"
                })
                .attr("stroke-width", 1)
                .attr("stroke", settings.scaleColor);
            var scaleText = d3.select("#" + canvasId + " svg").append("text")
                .attr("transform", "translate(" + translatewidth + "," + translateheight + ")")
                .attr("x", scaleLineWidth / 2 + scaleLinePadding)
                .attr("y", 36)
                .attr("font-family", "sans-serif")
                .text("0")
                .attr("font-size", "14px")
                .attr("fill", settings.scaleColor)
                .attr("text-anchor", "middle");
            jQuery.extend(baseTree.data, {
                scaleText: scaleText,
                scaleId: scaleId
            });
        }

        // variable i is set to the number of leaves (see above)
        jQuery.extend(baseTree.data, {
            canvasId: canvasId,
            root: root,
            tree: tree,
            svg: svg,
            i: 0,
            id: findTreeIndex(name),
            zoomBehaviour: zoomBehaviour,
            zoomBehaviourSemantic: zoomBehaviourSemantic,
        });

        postorderTraverse(baseTree.data.root, function (d) {
            d.leaves = getChildLeaves(d);
            d.mouseoverHighlight = false;
            if (d.children || d._children) {
                d.triangleLength = getCollapsedTriangleLength(d);
            }
        });

        applyEventListeners(baseTree.data);
        jQuery.extend(baseTree.data, {
            treeWidth: settings.treeWidth,
            treeHeight: settings.treeHeight
        });

        if (settings.fitTree === "scale") {
            var renderHeight = height - paddingVertical * 2;
            var leavesVisible = getVisibleLeaves(baseTree.root);
            var leavesHidden = 0;
            var triangles = 0;
            postorderTraverse(baseTree.root, function (d) {
                if (d._children) {
                    leavesHidden += d.leaves.length;
                    triangles += 1;
                }
            }, false);

            var newHeight;
            if (leavesVisible > 0) {
                newHeight = renderHeight / ((leavesVisible + leavesHidden) * 0.9);

            } else {
                newHeight = renderHeight / ((leavesVisible + leavesHidden) * 0.9);
                newHeight = (newHeight * triangleHeightDivisor);
                newHeight = newHeight - (newHeight / triangleHeightDivisor / 2);
                baseTree.data.prevNoLeavesVisible = true;
            }

            var longest = 0;
            addParents(baseTree.data.root);
            // find longest path between leaf to root
            postorderTraverse(baseTree.data.root, function (d) {
                var l = getLength(d);
                if (l > longest) {
                    longest = l;
                }
            });

            // returns length from root to farthest leaf in branch lengths
            maxLength = getMaxLengthVisible(baseTree.data.root);
            baseTree.data.maxLength = getLength(longestNode);
            /* baseTree.data.treeWidth = width - (2 * paddingHorizontal); */
            baseTree.data.treeWidth = width - paddingHorizontal;
            baseTree.data.treeHeight = newHeight;
        }

        update(baseTree.root, baseTree.data, undefined, treeToggle);

        // where zoom centers
        baseTree.data.zoomBehaviour.translate([90, 25]);
        baseTree.data.zoomBehaviour.scale(0.8);
        // move the tree to the coordinates and scale it smaller
        d3.select("#" + baseTree.data.canvasId + " svg g")
            .attr("transform", "translate(" + [90, 25] + ") scale(0.8)");

        d3.select(self.frameElement).style("height", "500px");

        function semanticZoom() {
            var scale = d3.event.scale;
            var prev = baseTree.data.prevSemanticScale;
            if (prev > scale) {
                sizeVertical(baseTree.data, true);
                sizeHorizontal(baseTree.data, true);
                update(baseTree.root, baseTree.data, 0);
                baseTree.data.prevSemanticScale = scale;
                if (baseTree.data.prevTransform) {
                    zoomBehaviourSemantic.translate(baseTree.data.prevTransform);
                } else {
                    zoomBehaviourSemantic.translate([0, 0]);
                }
            } else if (prev < scale) {
                sizeVertical(baseTree.data, false);
                sizeHorizontal(baseTree.data, false);
                update(baseTree.root, baseTree.data, 0);
                if (baseTree.data.prevTransform) {
                    zoomBehaviourSemantic.translate(baseTree.data.prevTransform);
                } else {
                    zoomBehaviourSemantic.translate([0, 0]);
                }
            } else if (prev === scale) {

                var translation = d3.event.translate;
                zoomBehaviourSemantic.translate(translation);
                if (settings.enableScale) {
                    applyScaleText(scaleText, scale, root);
                }
                baseTree.data.prevTransform = translation;
                d3.select("#" + canvasId + " svg g")
                    .attr("transform", "translate(" + translation + ")");
            }
            baseTree.data.prevSemanticScale = scale;

        }

        function zoom() {
            var scale = d3.event.scale;
            var translation = d3.event.translate;
            zoomBehaviour.translate(translation);
            zoomBehaviour.scale(scale);
            if (settings.enableScale) {
                applyScaleText(scaleText, scale, root);
            }
            if (settings.enableZoomSliders) {
                $("#zoomSlider" + baseTree.data.id).val(scale);
            }
            d3.select("#" + canvasId + " svg g")
                .attr("transform", "translate(" + translation + ")" + " scale(" + scale + ")");
            d3.selectAll(".tooltipElem").remove();

            var tooltips = $("[id$=tooltipElem]	");
            for (var i = 0; i < tooltips.length; i++) {
                var tooltip = tooltips[i];
                if (scrolling) {
                    tooltip.parentNode.removeChild(tooltip)
                } else {
                    tooltipTransMat = $('#' + tooltip.id).css("-webkit-transform").match(/(-?[0-9\.]+)/g);
                    tooltip.style['-webkit-transform'] = "translate(" + (parseFloat(tooltipTransMat[4]) + dx) + "px," + (parseFloat(tooltipTransMat[5]) + dy) + "px)"
                }
            }

        }

    }

    /*---------------
     /
     /    Returns number of visible leaves in the tree
     /
     ---------------*/
    function getVisibleLeaves(d) {
        var visible = 0;
        postorderTraverse(d, function (e) {
            var children = getChildren(e);
            if (children.length === 0) {
                visible += 1;
            }
        }, false);
        return visible;
    }

    /*---------------
     /
     /    EXTERNAL: update the collapsed nodes according to the new render depth
     /
     ---------------*/
    function changeAutoCollapseDepth(depth) {
        settings.autoCollapse = depth;

        for (var i = 0; i < renderedTrees.length; i++) {
            if (depth === null) {
                uncollapseAll(renderedTrees[i].root);
            } else {
                limitDepth(renderedTrees[i].root, depth);
            }
        }

        if (renderedTrees.length === 2) {
            settings.loadingCallback();
            setTimeout(function () {
                // renderedTreesand trees index do not
                // necessarily correspond
                getVisibleBCNsUsingWorkers(findTreeIndex(renderedTrees[0].name), findTreeIndex(renderedTrees[1].name));
                update(renderedTrees[0].root, renderedTrees[0].data);
                update(renderedTrees[1].root, renderedTrees[1].data);
            }, 2);
        } else {
            update(renderedTrees[0].root, renderedTrees[0].data);
        }
    }

    /*---------------
     /
     /    Expand all collapsed nodes on the path to given leaf node
     /
     ---------------*/
    function expandPathToLeaf(leaf, unhighlight, uncollapse) {
        if (unhighlight === undefined) {
            unhighlight = false;
        }
        if (uncollapse === undefined) {
            uncollapse = true;
        }

        if (leaf.parent) {
            if (!unhighlight) {
                if (uncollapse && leaf.parent._children) {
                    leaf.parent.children = leaf.parent._children;
                    leaf.parent._children = null;
                }
                d3.select("#" + leaf.parent.ID + "_" + leaf.ID).classed("search", true);
                d3.select("#" + leaf.ID).select("circle").classed("search", true);
                d3.select("#" + leaf.ID).select("text").classed("search", true);
            }
            else {
                d3.select("#" + leaf.parent.ID + "_" + leaf.ID).classed("search", false);
                d3.select("#" + leaf.ID).select("circle").classed("search", false);
                d3.select("#" + leaf.ID).select("text").classed("search", false);
            }
            expandPathToLeaf(leaf.parent, unhighlight, uncollapse);
        }
    }

    /**
     Expand all collapsed nodes on path to internal node
     */
    function expandPathToNode(node) {
        if (node.parent) {
            if (node.parent._children) {
                node.parent.children = node.parent._children;
                node.parent._children = null;
            }
            expandPathToNode(node.parent);
        }
    }


    /**
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it already has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003
     */
    function getVisibleBCNs(tree1, tree2, recalculate) {

        if (recalculate === undefined) {
            recalculate = true;
        }

        function getAllBCNs(d, t) {
            var children = getChildren(d);
            if (children.length > 0) {
                for (var a = 0; a < children.length; a++) {
                    getAllBCNs(children[a], t);
                }
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }
                return;
            } else {
                if (recalculate || !d.elementBCN) {
                    BCN(d, t);
                }
                return;
            }
        }
        getAllBCNs(tree1, tree2);
        getAllBCNs(tree2, tree1);
    }

    /**
     Description:
     Calculate the Best Corresponding Node (BCN) for all visible nodes (not collapsed) in the tree
     if recalculate==false, doesn't calculate for a node if it already has a value
     Algorithm adapted from: TreeJuxtaposer: Scalable Tree Comparison Using Focus+Context with Guaranteed Visibility, Munzner et al. 2003

     First compares all nodes of tree1 to tree2 and then all nodes of tree2 to tree1
     At the end of the function, each node from each tree will end up with a BCN and a similarity score
     */
    function getVisibleBCNsUsingWorkers(index1, index2, recalculate, highlight) {

        var tree1 = trees[index1].root;
        var tree2 = trees[index2].root;


        if (recalculate === undefined) {
            recalculate = true;
        }

        if (highlight === undefined) {
            highlight = false;
        }

        var worker1 = $.work({ file: './js/bcn_processor.js', args: { tree1: tree1, tree2: tree2, recalculate: recalculate } });
        var worker2 = $.work({ file: './js/bcn_processor.js', args: { tree1: tree2, tree2: tree1, recalculate: recalculate } });

        $.when(worker1, worker2).done(function (t1, t2) {
            var bcnvalT1 = [];
            var bcnobjT1 = [];
            var bcnvalT2 = [];
            var bcnobjT2 = [];

            postorderTraverse(t1, function (d) {
                bcnobjT1.push(d.elementBCN);
                bcnvalT1.push(d.elementS);

            });
            postorderTraverse(t2, function (d) {
                bcnobjT2.push(d.elementBCN);
                bcnvalT2.push(d.elementS);
            });

            var i;

            i = 0;
            postorderTraverse(trees[index1].data.root, function (d) {
                d.elementBCN = bcnobjT1[i];
                d.elementS = bcnvalT1[i];
                i++;
            });

            i = 0;
            postorderTraverse(trees[index2].data.root, function (d) {
                d.elementBCN = bcnobjT2[i];
                d.elementS = bcnvalT2[i];
                i++;
            });


            if (!highlight) {

                update(trees[index1], trees[index1].data);
                update(trees[index2], trees[index2].data);

                // When adding a new link (by expanding a node for instance)
                // the links array gets updated, but the enter function does not
                // return the right selection
                // (acts as if nothing was added at all)
                // Thus the tree looks clumsy
                // Please note that in case "Collapse" followed by a "Expand"
                // this issue does not occur...
                // And the bug is specific to the new implementation
                // using workers

                // The reason is the following:
                // the new nodes are added at the beginning of the list and are assigned
                // already existing numeric IDs...
                // Example:
                // New nodes:
                // TARGET ID: node_8657 TARGET NUMERIC ID: 739
                // TARGET ID: node_8994 TARGET NUMERIC ID: 738
                // 739 and 738 are already assigned to 2 existing nodes:
                // TARGET ID: node_8354 TARGET NUMERIC ID: 738
                // TARGET ID: node_7193 TARGET NUMERIC ID: 739
                //
                // To fix this bug, we need to reset all the numeric identifiers
                // Please note that the numeric identifiers are built by incrementing the
                // number of leaves in the tree.

                compareMode = true;
                settings.loadedCallback();
            }
        });
    }

    /**
     Description:
     Calculates some stuff needed for calculating BCNs later on
     First associate via parameter correspondingLeaf all the leaves from tree1 with a common leaf (= same name)
     in tree 2 and vice versa.
     Then, for each node in each tree, get the list of leaves
     Lastly, call getVisibleBCNs (description above)

     Arguments:
     index1 index of the first tree in the trees table
     index2 index of the second tree in the trees table
     */
    function preprocessTrees(trees1, trees2) {

        var tree1 = trees1.root;
        var tree2 = trees2.root;

        for (var i = 0; i < tree1.leaves.length; i++) {
            for (var j = 0; j < tree2.leaves.length; j++) {
                if (tree1.leaves[i].name === tree2.leaves[j].name) {
                    tree1.leaves[i].correspondingLeaf = tree2.leaves[j];
                    tree2.leaves[j].correspondingLeaf = tree1.leaves[i];
                }
            }
        }

        createDeepLeafList(tree1);
        createDeepLeafList(tree2);

        var isChrome = !!window.chrome && !!window.chrome.webstore;

        if (trees1.name === undefined) { // this part is important due to the clonening . . .
            trees1.name = trees1.root.ID.split("_")[0] + "_" + trees1.root.ID.split("_")[1]
        } else if (trees2.name === undefined) {
            trees2.name = trees2.root.ID.split("_")[0] + "_" + trees2.root.ID.split("_")[1]
        }

        // use web workers only if trees are very large
        if ((tree1.deepLeafList.length > 100 || tree2.deepLeafList.length > 100) && !isChrome) {
            getVisibleBCNsUsingWorkers(findTreeIndex(trees1.name), findTreeIndex(trees2.name));
        } else {
            getVisibleBCNs(tree1, tree2);
            update(trees[findTreeIndex(trees1.name)], trees[findTreeIndex(trees1.name)].data);
            update(trees[findTreeIndex(trees1.name)], trees[findTreeIndex(trees2.name)].data);
            settings.loadedCallback();
        }

    }

    /**
     Spanning tree: if a node in the opposite tree is common with a given leaf (same name),
     then all the nodes are associated to the leaf.

     Example:
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     vs
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     In tree 1, node C,D (0.5) is associated with opposite spanning tree:
     - Root (length: 0.1 and depth: 0)
     - C,D  (length: 0.5 and depth: 1)
     - C    (length: 0.3 and depth: 2)
     - D    (length: 0.4 and depth: 2)

     Description:
     Get a spanning tree associated to leaves

     Arguments:
     - node is set to opposite tree
     - leaves are searched in opposite tree in order to find the spanning tree
     */
    function getSpanningTree(tree, node) {
        var nodes = [];
        for (var i = 0; i < tree.leaves.length; i++) {
            var test = $.inArray(tree.leaves[i].name, node.deepLeafList);
            if (test > -1) {
                nodes.push(tree);
                var children = getChildren(tree);
                for (var j = 0; j < children.length; j++) {
                    nodes = nodes.concat(getSpanningTree(children[j], node));
                }
                return nodes;
            }
        }
        return nodes;
    }

    /**
     * Description:
     *  Get the best corresponding node in opposite tree for node v
     *  First gets the list of leaves of node v
     *  Then finds the list of spanning trees (see definition above)
     *  For each spanning tree, evaluates the similarity with node v
     *  and assigns the best scoring node to node v as well as a
     *  similarity score
     *
     * Arguments: v is a node
     *            tree is a tree
     */
    function BCN(v, tree) {

        var elementBCNNode = null;
        var maxElementS = 0;
        var spanningTree = getSpanningTree(tree, v);

        for (var i = 0; i < spanningTree.length; i++) {
            //get elementBCN for node v
            var x = getElementS(v, spanningTree[i]);
            if (x > maxElementS) {
                maxElementS = x;
                elementBCNNode = spanningTree[i];
            }
        }
        v.elementBCN = elementBCNNode;
        v.elementS = maxElementS;
    }

    /**
     Description:
     Creates list of leaves of each node in subtree rooted at v

     Note:
     Difference between deep leaf list and leaves in:
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     - Root has leaves: A, B, C and D (terminal leaves)
     - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)
     */
    function createDeepLeafList(_tree) {

        postorderTraverse(_tree, function (d) {
            var deepLeafList = [];
            for (var i = 0; i < d.leaves.length; i++) {
                deepLeafList.push(d.leaves[i].name)
            }
            d.deepLeafList = deepLeafList;
        });
    }

    /**
     Description:
     Get the comparison score between two nodes
     First gets all the leaves from the 2 nodes/trees
     Then get the number of common elements in both lists
     Computes a score (the higher, the better the comparision)

     Note:
     Difference between deep leaf list and leaves in:
     (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
     - Root has leaves: A, B, C and D (terminal leaves)
     - Root has deep leaves: A, B, C, D and CD (terminal leaves + intermediate leaves)

     Arguments:
     v is a node
     n is a tree or a sub-tree

     Returns
     the similarity score
     */
    function getElementS(v, n) {
        var lv = v.deepLeafList;
        var ln = n.deepLeafList;

        var lvlen = lv ? lv.length : 0;
        var lnlen = ln ? ln.length : 0;

        var intersect = _.intersection(lv, ln).length;
        return intersect / (lvlen + lnlen - intersect);
    }

    /**
     get index of a tree in trees by its name
     */
    function findTreeIndex(name) {
        for (var i = 0; i < trees.length; i++) {
            if (name === trees[i].name) {
                return i;
            }
        }
    }

    function initialiseTree(tree, autocollapse) {
        findScaleValueBranchSupport(tree);
        uncollapseAll(tree); // use postorderTraverse, does not call update function
        stripPreprocessing(tree); // use postorderTraverse, reset all existing settings
        getDepths(tree); // get all the children and set their level in the hierarchy

        // use postorderTraverse to set the collapsed the children to _children
        postorderTraverse(tree, function (d) {
            if (d.name === "collapsed" || d.collapsed) {
                d._children = d.children;
                d.collapsed = true;
                d.children = null;
            }
        });

        if (autocollapse !== null) {
            limitDepth(tree, autocollapse);
        }
    }
    /*---------------
     /
     /    EXTERNAL: external function for initialising a tree comparison visualisation
     /
     ---------------*/
    function compareTrees(name1, canvas1, name2, canvas2, scale1, scale2) {
        //renderedTrees= [];

        var index1 = findTreeIndex(name1);
        var index2 = findTreeIndex(name2);

        //initialize all functions
        initializeRenderTreeCanvas(name1, canvas1, scale1);
        initializeRenderTreeCanvas(name2, canvas2, scale2);

        var firstTree1 = trees[index1];
        var firstTree2 = trees[index2];

        initialiseTree(firstTree1.root, settings.autoCollapse);
        initialiseTree(firstTree2.root, settings.autoCollapse);

        // render tress (workers) -> once done, run comprison (workers)
        firstTree1.data.clickEvent = getClickEventListenerNode(firstTree1, true, firstTree2);//Click event listener for nodes
        firstTree1.data.clickEventLink = getClickEventListenerLink(firstTree1, true, firstTree2);//Click event listener for links. Assigns a function to the event.
        renderTree(firstTree1, name1, canvas1, scale1, name2);

        firstTree2.data.clickEvent = getClickEventListenerNode(firstTree2, true, firstTree1);
        firstTree2.data.clickEventLink = getClickEventListenerLink(firstTree2, true, firstTree1);
        renderTree(firstTree2, name2, canvas2, scale2, name1);

        settings.loadingCallback();
        setTimeout(function () {
            preprocessTrees(firstTree1, firstTree2);
        }, 10);



        // 4 cases to check if left and right have multiple trees
        if (trees[index1].hasOwnProperty("multiple") && trees[index2].hasOwnProperty("multiple")) {

            createTreeToggle(name1, canvas1, scale1, canvas2, scale2);
            createTreeToggle(name2, canvas2, scale2, canvas1, scale1);

        } else if (trees[index1].hasOwnProperty("multiple") && !trees[index2].hasOwnProperty("multiple")) {

            createTreeToggle(name1, canvas1, scale1, canvas2, scale2);

        } else if (!trees[index1].hasOwnProperty("multiple") && trees[index2].hasOwnProperty("multiple")) {

            createTreeToggle(name2, canvas2, scale2, canvas1, scale1);

        }

    }

    /*---------------
     /
     /    EXTERNAL: external function for initialising a single tree visualisation
     /
     ---------------*/

    function viewTree(name, canvasId, scaleId) {

        //renderedTrees= [];
        var index = findTreeIndex(name);
        initializeRenderTreeCanvas(name, canvasId, scaleId);
        if (trees[index].hasOwnProperty("multiple")) {
            var firstTree = trees[index];
            var newName = firstTree.name;


            initialiseTree(firstTree.root, settings.autoCollapse);
            firstTree.data.clickEvent = getClickEventListenerNode(firstTree, false, {});
            firstTree.data.clickEventLink = getClickEventListenerLink(firstTree, false, {});
            renderTree(firstTree, newName, canvasId, scaleId);

            createTreeToggle(name, canvasId, scaleId);

        } else {
            //updateUndo(index);
            initialiseTree(trees[index].root, settings.autoCollapse);
            trees[index].data.clickEvent = getClickEventListenerNode(trees[index], false, {});
            trees[index].data.clickEventLink = getClickEventListenerLink(trees[index], false, {});
            renderTree(trees[index], name, canvasId, scaleId);

        }
    }

    /*
     collapse all nodes deeper in tree than depth
     */
    function limitDepth(d, depth) {
        if (d.depth > depth) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
                d.collapsed = true;
            }
        } else {
            uncollapseNode(d);
        }
        var children = getChildren(d);
        for (var i = 0; i < children.length; i++) {
            limitDepth(children[i], depth);
        }
    }

    /*
     uncollapse all collapsed nodes
     */
    function uncollapseAll(root, tree) {
        postorderTraverse(root, uncollapseNode);
        if (tree !== undefined) {
            update(root, tree.data);
        }
    }

    /*
     uncollapse single node.
     */
    function uncollapseNode(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
    }

    /*
     Strip everything from the last time the tree was rendered
     prevents rendering bugs on second render
     */
    function stripPreprocessing(root) {
        postorderTraverse(root, function (d) {
            d.elementBCN = null;
            d.elementS = null;
            d.x = null;
            d.y = null;
            d.x0 = null;
            d.y0 = null;
            d.source = null;
            d.target = null;
            d.baseX = null;
            d.baseY = null;
            d.id = null;
        });
    }

    /*
     annotate each node in the tree with its depth
     */
    function getDepths(root, inc) {
        if (inc === undefined) {
            inc = 0;
        }
        root.depth = inc;
        var children = getChildren(root);
        inc += 1;
        for (var i = 0; i < children.length; i++) {
            getDepths(children[i], inc);
        }
    }

    /*
     clear tooltips from the visualisation
     */
    function removeTooltips(svg) {
        if (svg) {
            svg.selectAll(".tooltipElem").remove();
        }
    }


    // function that allows to swap two branches when clicking on note d
    function rotate(d, tree, comparedTree) {
        var load = false;
        if (comparedTree && d._children) {
            load = true;
            settings.loadingCallback();
        }
        setTimeout(function () {
            if (load) {
                settings.loadedCallback();
            }
            // here the actual rotation happens
            var first = d.children[0];
            var second = d.children[1];
            d.children[0] = second;
            d.children[1] = first;

            update(d, tree.data);
        }, 2);

    }

    function collapse(d, tree, comparedTree) {

        /* Called on collapse AND uncollapse / expand. */
        var load = false;
        if (comparedTree && d._children) {
            load = true;
            settings.loadingCallback();
        }
        setTimeout(function () {
            if (d.children) {
                d.collapsed = true;
                d._children = d.children;
                d.children = null;
            } else {
                d.collapsed = false;
                d.children = d._children;
                d._children = null;

                if (comparedTree) {
                    // fixed bug on collapsing then highlighting and uncollapsing
                    if (d.clickedParentHighlight) {
                        postorderTraverse(d, function (e) {
                            e.clickedParentHighlight = true;
                        });
                    }
                    postorderTraverse(d, function (e) {
                        BCN(e, comparedTree.root);
                    }, false);
                }
            }
            if (load) {
                settings.loadedCallback(); // stops the spinning wheels
            }
            update(d, tree.data);
        }, 2);

    }

    function collapseAll(d, tree, comparedTree, forceUncollapse) {
        var load = false;
        if (comparedTree && d._children) {
            load /*._children*/ = true;  // _children causes the spinny wheel to never go 'load' and go away
            settings.loadingCallback();
        }

        if (forceUncollapse === undefined) {
            forceUncollapse = false
        }
        setTimeout(function () {
            if (d._children || forceUncollapse) {// used when collapsed for uncollapsing
                postorderTraverse(d, function (e) {
                    if (e._children) {
                        e.collapsed = false;
                        e.children = e._children;
                        e._children = null;
                    }
                    if (comparedTree) {
                        if (d.clickedParentHighlight) {
                            postorderTraverse(d, function (e) {
                                e.clickedParentHighlight = true;
                            });
                        }
                        BCN(e, comparedTree.root);
                    }
                });
            } else if (d.children) { //used when uncollapsed for collapsing
                postorderTraverse(d, function (e) {
                    if (e.children) {
                        e.collapsed = true;
                        e._children = e.children;
                        e.children = null;
                    }
                });
            }
            if (load) {
                settings.loadedCallback();
            }

            update(d, tree.data);
        }, 2)

    }


    function highlight(d, tree, comparedTree) {
        var bcnColors = d3.scale.category20();

        if (comparedTree) {
            function colorLinkNodeOver(n, hl) {
                if (n.children) {
                    for (var i = 0; i < n.children.length; i++) {
                        colorLinkNodeOver(n.children[i], hl);
                    }
                }
                if (hl) {
                    n.clickedParentHighlight = true;
                } else {
                    n.clickedParentHighlight = false;
                }
            }

            function clearHighlight(itree) {
                var new_d = itree;
                var doClear = false;
                postorderTraverse(itree, function (e) {
                    if (e.clickedHighlight) {
                        new_d = e;
                        doClear = true;
                    }
                }, false);
                if (doClear) {
                    new_d.clickedHighlight = false;
                    var index = highlightedNodes.indexOf(new_d);

                    if (index > -1) {
                        highlightedNodes.splice(index, 1);
                    }
                    new_d[currentBCN].bcnhighlight = false;
                    var leaves = new_d.leaves;
                    var otherTreeData = comparedTree.data;
                    for (var i = 0; i < leaves.length; i++) {
                        if (leaves[i].correspondingLeaf !== undefined) {
                            leaves[i].correspondingLeaf.correspondingHighlight = false;
                        }
                    }

                    colorLinkNodeOver(new_d, false);
                    update(new_d, tree.data);
                    update(otherTreeData.root, otherTreeData);
                }
            }

            var leaves;
            var otherTree;
            var otherTreeData;
            var i;
            if (!_.contains(highlightedNodes, d)) {
                clearHighlight(tree.root);
                if (highlightedNodes.length < maxHighlightedNodes) {
                    d.clickedHighlight = "red";
                    d[currentBCN].bcnhighlight = bcnColors(highlightedNodes.length);
                    highlightedNodes.push(d);
                    leaves = d.leaves;
                    otherTree = comparedTree.root;
                    otherTreeData = comparedTree.data;

                    for (i = 0; i < leaves.length; i++) {
                        if (leaves[i].correspondingLeaf !== undefined) {
                            leaves[i].correspondingLeaf.correspondingHighlight = true;
                        }

                    }
                    expandPathToNode(d[currentBCN]);
                    settings.loadingCallback();
                    setTimeout(function () {
                        getVisibleBCNs(otherTree, tree.root, false);
                        settings.loadedCallback();
                        colorLinkNodeOver(d, true);
                        update(d, tree.data);
                        update(otherTreeData.root, otherTreeData);
                        if (settings.moveOnClick && (d[currentBCN].y && d[currentBCN].x)) { // this part is
                            // responsible to move the
                            // opposite highlighted
                            // node to the center
                            var currentScale = otherTreeData.zoomBehaviour.scale();

                            var y = (-d[currentBCN].y + ($("#" + otherTreeData.canvasId).width() / 2) / currentScale);
                            var x = (-d[currentBCN].x + ($("#" + otherTreeData.canvasId).height() / 2) / currentScale);

                            otherTreeData.zoomBehaviour.translate([y, x]);
                            d3.select("#" + otherTreeData.canvasId + " svg g")
                                .transition(1500)
                                .attr("transform", "scale(" + currentScale + ")" + "translate(" + otherTreeData.zoomBehaviour.translate() + ")");
                        }
                    }, 2);

                }
            } else {
                d.clickedHighlight = false;
                var index = highlightedNodes.indexOf(d);

                if (index > -1) {
                    highlightedNodes.splice(index, 1);
                }
                d[currentBCN].bcnhighlight = false;
                leaves = d.leaves;
                otherTree = comparedTree.root;
                otherTreeData = comparedTree.data;

                for (i = 0; i < leaves.length; i++) {
                    leaves[i].correspondingLeaf.correspondingHighlight = false;
                }
                colorLinkNodeOver(d, false);
                update(d, tree.data);
                update(otherTreeData.root, otherTreeData);
            }
        }
    }

    // if (!d.children && !d._children && d.searchHighlight === true) {
    //     expandPathToLeaf(d, true);
    //     update(tree.root, tree.data);
    // }

    function getSibling(d) {
        var sibling = undefined;
        //var indexSibling = d.parent.children.indexOf(sibling);
        if (d.parent.children.length >= 2) {
            for (var i = 0; i < d.parent.children.length; i++) {
                if (d.parent.children[i] !== d) {
                    sibling = d.parent.children[i];
                }
            }
        }
        return sibling
    }

    function cutBranch(d, tree) {
        var sibling = getSibling(d);
        var droot = d.parent;
        if (droot === tree.root) {
            d.parent.children[0] = sibling.children[0];
            d.parent.children[1] = sibling.children[1];
        } else {
            var droot_index = droot.parent.children.indexOf(droot);
            if (d.parent.parent.children[droot_index] != undefined) {
                var newLenght = sibling.length + d.parent.parent.children[droot_index].length;
                sibling.length = newLenght;
            }
            d.parent.parent.children[droot_index] = sibling;

        }
        postorderTraverse(tree.data.root, function (e) {
            e.leaves = getChildLeaves(e);
        });

        return tree;
    }

    function editLabel(d, tree, comparedTree) {
        // Read in input
        var new_label = prompt('Enter new label');
        var current_label = d.name;

        if (new_label !== current_label) {
            var found = false;

            function check_label(e) {
                //checking for the same label in another part of the tree.
                if (e.name === new_label) {
                    found = true;
                } else if (!found && e.children) {
                    e.children.forEach(check_label);
                }
            };

            check_label(tree.root);
            if (comparedTree && !found) {
                check_label(comparedTree.root);
            }
            if (!found) {
                // Change on this d and any matched d.
                d.name = new_label;  // TODO: strip HTML tags....
                if (d.correspondingLeaf) {
                    d.correspondingLeaf.name = new_label;
                }
                // Update both trees
                update(d, tree.data);
                if (comparedTree) {
                    update(comparedTree.root, comparedTree.data);
                }
            } else {
                // Found label already
            }
        }
    }

    /*
     get relevant event listener for clicking on a link depending on what mode is selected
     */
    function getClickEventListenerLink(tree, isCompared, comparedTree) {
        var treeIndex = findTreeIndex(tree.name);
        function linkClick(e) {
            var d = e.target;
            var root = tree.root.children[0];
            var svg = tree.data.svg;

            //render the tooltip on click
            //user then chooses which function above to call
            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 150;
            var rectHeight = 90;

            var rpad = 10;
            var tpad = 18;
            var textDone = 0;
            var textInc = 18;


            // ensures that operations on branches and nodes are displayed on top of links and nodes
            d3.selection.prototype.moveToFront = function () {
                return this.each(function () {
                    this.parentNode.appendChild(this);
                });
            };

            d3.selectAll(".tooltipElem").remove(); // ensures that not multiple reactangles are open when clicking on another node
            var coordinates = d3.mouse(this.parentNode.parentNode);
            var parent = d3.select(this.parentNode.parentNode);
            var maxX = parseInt(parent.style("width"), 10);
            var x = coordinates[0];
            var y = coordinates[1];
            var triangleY = y - triHeight;
            var triangleX = x;
            triangleType = "triangle-down";
            // menu above node by the height of the rectangle and triangle
            menuTop = triangleY - rectHeight;

            if (y < rectHeight + triHeight) {
                triangleY = y + triHeight;
                y += rectHeight + triHeight * 2;
                // flip triangle, menubox below node
                triangleType = "triangle-up";
                menuTop = triangleY;

            }

            /* make sure the menu appears inside the svg container */
            if (x < rectWidth / 2 + 5) {
                x = rectWidth / 2 + 10;
            } else if (x + rectWidth > maxX - 5) {
                x = maxX - (rectWidth / 2 + 10);
            }

            //draw the little triangle
            var tooltipContainer = d3.select(this.parentNode.parentNode).append("g")
                .attr("class", "tooltipElem")
                .attr("position", "absolute")
                .attr("top", x)
                .attr("left", y)
                .attr("width", rectWidth)
                .attr("height", triHeight + rectHeight)
                .moveToFront();

            tooltipContainer.append('path')
                .attr("d", d3.svg.symbol().type(triangleType).size(400))
                .attr("transform", function (d) { return "translate(" + triangleX + "," + triangleY + ")"; })
                .style("fill", "black")

            tooltipContainer.append("rect")
                .style("fill", "black")
                .attr("x", function () {
                    return x - (rectWidth / 2);

                })
                .attr("y", function () {
                    return menuTop;
                })

                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 6)
                .attr("ry", 6);

            function add_menu_item(selector, text_f, act_f) {
                // get coordinates of mouse click event

                d3.select(selector).append("text")
                    .attr("class", "tooltipElem tooltipElemText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x + (-rectWidth / 2) + rpad))
                    .attr("id", text_f)
                    .text(function (d) {
                        text = text_f(d);
                        if (text) {
                            textDone += textInc;
                            return (text);
                        }
                    })
                    .on("click", act_f);
            };



            add_menu_item(".tooltipElem",
                function () {
                    return 'reroot >'
                },
                function () {
                    // This is to reroot
                    d = e.target;
                    postorderTraverse(d, function (e) {
                        e.mouseoverHighlight = false;
                    });
                    if (tree.root.children.length < 3) {
                        updateUndo(treeIndex, "reroot", root);
                    } else {
                        updateUndo(treeIndex, "reset", root);
                    }
                    var rerootedTree = reroot(tree, d);
                    settings.loadingCallback();
                    setTimeout(function () {
                        if (isCompared) {
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, rerootedTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(tree.root, rerootedTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    manualReroot = true;
                });

            add_menu_item(".tooltipElem",
                function () { // text function
                    return "trim branch >";
                },
                function () {
                    d = e.target;
                    // undo functionality
                    //updateUndo(treeIndex, "collapse_expand", d);

                    // action function
                    postorderTraverse(d, function (e) {
                        e.mouseoverHighlight = false;
                    });
                    updateUndo(treeIndex, "restore_branch", d);
                    var cutTree = cutBranch(d, tree);
                    settings.loadingCallback();
                    setTimeout(function () {
                        if (isCompared) {
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, cutTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(tree.root, cutTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    manualReroot = true;

                });

            $(document).click(function (event) {
                if (!$(event.target).closest('#tooltipElem').length && $('#tooltipElem').is(":visible")) {
                    $('#tooltipElem').hide()
                }
            });
            d3.select(this.parentNode.parentNode).selectAll(".tooltipElemText").each(function (d) {
                d3.select(this).on("mouseover", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "green").style("cursor", "pointer");
                });
                d3.select(this).on("mouseout", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });
        }

        return linkClick
    }

    /*
     get relevant event listener for clicking on a node depending on what mode is selected
     */
    function getClickEventListenerNode(tree, isCompared, comparedTree) {

        var treeIndex = findTreeIndex(tree.name);
        function nodeClick(d) {
            var svg = tree.data.svg;

            var triWidth = 10;
            var triHeight = 15;
            var rectWidth = 170;
            var rectHeight = 120;
            if (multiSelected[0] && multiSelected[1]) {
                rectHeight += 18 * 2
            }
            else if (multiSelected[0] || multiSelected[1]) {
                rectHeight += 18
            }

            var rpad = 10;
            var tpad = 18;
            var textDone = 0;
            var textInc = 18;

            // ensures that operations on branches and nodes are displayed on top of links and nodes
            d3.selection.prototype.moveToFront = function () {
                return this.each(function () {
                    this.parentNode.appendChild(this);
                });
            };

            d3.selectAll(".tooltipElem").remove(); // ensures that not multiple reactangles are open when clicking on another node
            var coordinates = d3.mouse(this.parentNode.parentNode);
            var parent = d3.select(this.parentNode.parentNode);
            var maxX = parseInt(parent.style("width"), 10);
            var x = coordinates[0];
            var y = coordinates[1];
            var triangleY = y - triHeight;
            var triangleX = x;
            triangleType = "triangle-down";
            // menu above node by the height of the rectangle and triangle
            menuTop = triangleY - rectHeight;

            if (y < rectHeight + triHeight) {
                triangleY = y + triHeight;
                y += rectHeight + triHeight * 2;
                // flip triangle, menubox below node
                triangleType = "triangle-up";
                menuTop = triangleY;

            }

            /* make sure the menu appears inside the svg container */
            if (x < rectWidth / 2 + 5) {
                x = rectWidth / 2 + 10;
            } else if (x + rectWidth / 2 > maxX - 5) {
                x = maxX - (rectWidth / 2 + 10);
            }

            //draw the little triangle
            var tooltipContainer = d3.select(this.parentNode.parentNode).append("g")
                .attr("class", "tooltipElem")
                .attr("top", x)
                .attr("left", y)
                .attr("width", rectWidth)
                .attr("height", triHeight + rectHeight)
                .moveToFront();

            tooltipContainer.append('path')
                .attr("d", d3.svg.symbol().type(triangleType).size(400))
                .attr("transform", function (d) { return "translate(" + triangleX + "," + triangleY + ")"; })
                .style("fill", "black")

            tooltipContainer.append("rect")
                .style("fill", "black")
                .attr("x", function () {
                    return x - (rectWidth / 2);

                })
                .attr("y", function () {
                    return menuTop;
                })

                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 6)
                .attr("ry", 6);


            function add_menu_item(selector, text_f, act_f) {
                d3.select(selector).append("text")
                    .attr("class", "tooltipElem tooltipElemText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x + (-rectWidth / 2) + rpad))
                    .attr("id", text_f)
                    .text(function (d) {
                        var text = text_f(d);
                        if (text) {
                            textDone += textInc;
                            return (text);
                        }
                    })
                    .on("click", act_f);
            };

            if (d.children || d._children) {

                tooltipContainer.append("line")
                    .attr("x1", (x + (-rectWidth / 2)))
                    .attr("x2", (x + (-rectWidth / 2)) + rectWidth)
                    .attr("y1", (menuTop + tpad + textDone) + 6)
                    .attr("y2", (menuTop + tpad + textDone) + 6)
                    .attr("stroke", "white")
                    .attr("stroke-width", "1");

                d3.select(".tooltipElem").append("text")
                    .attr("class", "tooltipElemInfoText")
                    .attr("y", (menuTop + tpad + textDone))
                    .attr("x", (x + (-rectWidth / 2) + rpad))
                    .attr("id", "infoText")
                    .text(function () {
                        if (d.elementS) {
                            return '#leaf: ' + d.leaves.length + ' | bcn: ' + d.elementS.toFixed(2);
                        } else {
                            return '#leaf: ' + d.leaves.length;
                        }
                    });
                // small extra space after infotext line
                textDone += textInc + 4;
            }

            if (!d.children && !d._children) {
                add_menu_item(".tooltipElem",
                    function () { // text function
                        return 'edit label >'
                    },
                    function () {
                        // undo function
                        updateUndo(treeIndex, "edit", d);

                        // action function
                        editLabel(d);
                        d.mouseoverHighlight = false;
                    });
            }
            if (d.parent && (d._children || d.children)) {
                add_menu_item(".tooltipElem",
                    function () { // text function
                        if (d._children !== undefined && !d.children) { // children invisible
                            return "expand >";
                        } else if (d.children) { //children visible
                            return "collapse >";
                        }
                    },
                    function () {
                        // undo functionality
                        updateUndo(treeIndex, "collapse_expand", d);

                        // action function
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared) {
                            collapse(d, tree, comparedTree);
                        } else {
                            collapse(d, tree);
                        }

                    });

                add_menu_item(".tooltipElem",
                    function () {
                        if (d._children) {
                            return "expand all >";
                        } else if (d.children) {
                            return "collapse all >";
                        }
                    },
                    function () {
                        // undo functionality
                        updateUndo(treeIndex, "collapse_expand_all", d);

                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared) {
                            collapseAll(d, tree, comparedTree);
                        } else {
                            collapseAll(d, tree);
                        }

                    });
            };

            //TODO: this has to be changed that also the subtree can be all expanded
            if (d.children || d._children) {
                add_menu_item(".tooltipElem",
                    function () {
                        // If d has *any* descendant that is collapsed, show label.
                        var found = false;

                        function check_collapsed(e) {
                            if (e._children && e !== d) {
                                found = true;
                            } else if (!found && e.children) {
                                e.children.forEach(check_collapsed);
                            }
                        };
                        check_collapsed(d);
                        if (found) {
                            return "expand all >";
                        }
                    },
                    function () {
                        // undo functionality
                        function check_collapsed(e) {
                            if (e.children) {
                                e.children.forEach(check_collapsed);
                            } else if (e._children && e !== d) {
                                updateUndo(treeIndex, "expand_all", e);
                            }
                        };
                        check_collapsed(d);


                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        uncollapseAll(d, tree);
                    });
            }

            // swap subtree menu option
            if (d.children) {
                add_menu_item(".tooltipElem",
                    function () {
                        return "swap subtrees >";
                    },
                    function () {
                        updateUndo(treeIndex, "swap", d);
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared) {
                            rotate(d, tree, comparedTree);
                            update(tree.root, tree.data);
                        } else {
                            rotate(d, tree);
                            update(tree.root, tree.data);
                        }
                    });
            };


            //Multi selecting, select as first option
            if (multiSelected[1] != d && multiSelected[0] != d) {
                add_menu_item(".tooltipElem",
                    function () {
                        return 'Select as first node >'
                    },
                    function () {
                        multiSelected[0] = d;
                        leavesOne = [];

                        function getChildren(d) {
                            multiChildren1 = [];
                            temp = d.leaves
                            for (i = 0; i < temp.length; i++) {
                                if (d != temp[i]) {
                                    multiChildren1.push(temp[i])
                                }
                                tmp = temp[i]
                                while (tmp != d) {
                                    if (!multiChildren1.includes(tmp)) {
                                        multiChildren1.push(tmp)
                                    }
                                    tmp = tmp.parent
                                }
                            }
                        }
                        getChildren(d)
                        var str =
                            "ID: " + d.ID.toString() +
                            "\nName: " + d.name.toString() +
                            "\nLength: " + d.length.toString() +
                            "\nDepth: " + d.depth.toString() +
                            "\nParent: " +
                            "\n\tID: " + d.parent.ID.toString() +
                            "\n\tName: " + d.parent.name.toString() +
                            "\n\tLength: " + d.parent.length.toString() +
                            "\n\tDepth: " + d.parent.depth.toString()

                        //document.getElementById('select1').value = str

                        update(tree.root, tree.data);
                        nodeName()
                    }
                );
            };

            //Multi selecting, select as second option
            if (multiSelected[0] && d != multiSelected[0] && multiSelected[1] != d) {
                add_menu_item(".tooltipElem",
                    function () {
                        return 'Select as second node >'
                    },
                    function () {
                        multiSelected[1] = d;
                        leavesTwo = [];
                        function getChildren(d) {
                            /*if (d.children) {
                                for (i = 0; i < d.children.length; i++) {
                                    multiChildren2.push(d.children[i])
                                    getChildren(d.children[i])
                                }
                            }*/
                            multiChildren2 = []
                            temp = d.leaves
                            for (i = 0; i < temp.length; i++) {
                                if (d != temp[i]) {
                                    multiChildren2.push(temp[i])
                                }
                                tmp = temp[i]
                                while (tmp != d) {
                                    if (!multiChildren2.includes(tmp)) {
                                        multiChildren2.push(tmp)
                                    }
                                    tmp = tmp.parent
                                }
                            }
                        }

                        getChildren(d)

                        var str =
                            "ID: " + d.ID.toString() +
                            "\nName: " + d.name.toString() +
                            "\nLength: " + d.length.toString() +
                            "\nDepth: " + d.depth.toString() +
                            "\nParent: " +
                            "\n\tID: " + d.parent.ID.toString() +
                            "\n\tName: " + d.parent.name.toString() +
                            "\n\tLength: " + d.parent.length.toString() +
                            "\n\tDepth: " + d.parent.depth.toString()

                        //document.getElementById('select2').value = str
                        update(tree.root, tree.data);
                        nodeName()
                    }
                );
            };

            //De-selecting things that were selected
            //If it is selected as first
            if (multiSelected[0] == d) {
                add_menu_item(".tooltipElem",
                    function () {
                        return 'Remove selection >'
                    },
                    function () {
                        /*multiSelected.shift()
                        multiChildren1 = multiChildren2
                        multiChildren2 = []*/
                        /*if(leavesTwo){
                            leavesOne = leavesTwo;
                            leavesTwo = [];
                        }
                        else{
                            leavesOne = [];
                        }*/
                        //document.getElementById('select1').value = document.getElementById('select2').value
                        //document.getElementById('select2').value = ""
                        multiSelected[0] = null;
                        multiChildren1 = [];
                        leavesOne = [];
                        update(tree.root, tree.data);
                        plotVenn(null)
                        document.getElementById("regRes").value = ""
                        nodeName()
                    }
                );
            };

            //If it is selected as second
            if (multiSelected[1] == d) {
                add_menu_item(".tooltipElem",
                    function () {
                        return 'Remove selection >'
                    },
                    function () {
                        /*toColor = document.getElementById(multiSelected[1].ID)
                        toColor.classList.toggle("multiSelect2")*/
                        multiSelected.pop();
                        multiChildren2 = []
                        leavesTwo = []
                        //document.getElementById('select2').value = ""
                        update(tree.root, tree.data);
                        plotVenn(null)
                        document.getElementById("regRes").value = ""
                        nodeName()
                    }
                );
            };

            //De-selecting everything
            if (multiSelected[0] && multiSelected[1]) {
                add_menu_item(".tooltipElem",
                    function () {
                        return 'Remove all selections >'
                    },
                    function () {
                        /*toColor1 = document.getElementById(multiSelected[0].ID)
                        toColor1.classList.toggle("multiSelect1")
                        toColor2 = document.getElementById(multiSelected[1].ID)
                        toColor2.classList.toggle("multiSelect2")*/
                        multiSelected.pop();
                        //document.getElementById('select1').value = ""
                        multiSelected.pop();
                        //document.getElementById('select2').value = ""
                        multiChildren1 = []
                        multiChildren2 = []
                        leavesOne = []
                        leavesTwo = []

                        update(tree.root, tree.data);
                        document.getElementById("regRes").value = ""
                        plotVenn(null)
                        nodeName()
                    }
                );
            };

            if (d.parent && d.elementBCN) {
                add_menu_item(".tooltipElem",
                    function () {
                        if (d.clickedHighlight) {
                            return "unhighlight >";
                        } else {
                            return "highlight >";
                        }
                    },
                    function () {
                        updateUndo(treeIndex, { "highlight": d });
                        postorderTraverse(d, function (e) {
                            e.mouseoverHighlight = false;
                        });
                        if (isCompared) {
                            highlight(d, tree, comparedTree);
                        } else {
                            highlight(d, tree);
                        }

                    });
            }

            d3.select(this.parentNode.parentNode).selectAll(".tooltipElemText").each(function (d) {
                d3.select(this).on("mouseover", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "green").style("cursor", "pointer");
                });
                d3.select(this).on("mouseout", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });

        }
        return nodeClick;
    }

    /*-----------------------------------
     * Update the undo global lists:
     *   undoTreeData
     *   undoTreeDataIndex
     * input:
     *   treeIndex: the current tree part of the global list of trees
     */
    function clone(obj) {
        var clonedObjectsArray = [];
        var originalObjectsArray = []; //used to remove the unique ids when finished
        var next_objid = 0;

        function objectId(obj) {
            if (obj == null) return null;
            if (obj.__obj_id == undefined) {
                obj.__obj_id = next_objid++;
                originalObjectsArray[obj.__obj_id] = obj;
            }
            return obj.__obj_id;
        }

        function cloneRecursive(obj) {
            if (null == obj || typeof obj == "string" || typeof obj == "number" || typeof obj == "boolean") return obj;

            // Handle Date
            if (obj instanceof Date) {
                var copy = new Date();
                copy.setTime(obj.getTime());
                return copy;
            }

            // Handle Array
            if (obj instanceof Array) {
                var copy = [];
                for (var i = 0; i < obj.length; ++i) {
                    copy[i] = cloneRecursive(obj[i]);
                }
                return copy;
            }

            // Handle Object
            if (obj instanceof Object) {
                if (clonedObjectsArray[objectId(obj)] != undefined)
                    return clonedObjectsArray[objectId(obj)];

                var copy;
                if (obj instanceof Function)//Handle Function
                    copy = function () { return obj.apply(this, arguments); };
                else
                    copy = {};

                clonedObjectsArray[objectId(obj)] = copy;

                for (var attr in obj)
                    if (attr != "__obj_id" && obj.hasOwnProperty(attr))
                        copy[attr] = cloneRecursive(obj[attr]);

                return copy;
            }


            throw new Error("Unable to copy obj! Its type isn't supported.");
        }
        var cloneObj = cloneRecursive(obj);



        //remove the unique ids
        for (var i = 0; i < originalObjectsArray.length; i++) {
            delete originalObjectsArray[i].__obj_id;
        };

        return cloneObj;
    }

    /*-----------------------------------
     * Update the undo global lists:
     *   undoTreeData
     *   undoTreeDataIndex
     * input:
     *   treeIndex: the current tree part of the global list of trees
     */
    function updateUndo(treeIndex, treeAction, treeActionData) {

        undoIndex = undoIndex + 1;

        if ($("#vis-container2").length !== 0) { // important since redo action need opposite tree
            if (treeIndex === (trees.length - 1)) {
                undoTreeDataIndex.push([treeIndex, treeIndex - 1]);
            } else {
                undoTreeDataIndex.push([treeIndex, treeIndex + 1]);
            }
        } else {
            undoTreeDataIndex.push([treeIndex]);
        }

        undoActionFunc.push(treeAction);
        undoActionData.push(treeActionData);
        var tmpTree = clone(trees[treeIndex].data);
        undoFullTreeData.push(tmpTree);
        $(".undoButton").attr("data-count", undoIndex);

    }

    /*-----------------------------------
     * External function that allows to add an undo functionality on tree operations
     * input:
     * buttonId: id element of the button that will perform the undo functionality
     */
    function undo(canvasId, buttonId) {

        d3.select("#" + canvasId).select("#" + buttonId)

            .on("click", function () {

                function findCanvasId(d) {
                    var treeIDSplit = d.ID.split("_");
                    var treeID = treeIDSplit[0] + "_" + treeIDSplit[1];
                    var id = $('#' + treeID).last().parent().prop('id');
                    return id;
                }

                if ($("#vis-container2").length !== 0) { // compare mode

                    // find tree in the right canvas
                    var slice_index = undefined;
                    for (var i = 0; i < undoActionData.length; i++) {
                        if (findCanvasId(undoActionData[i]) === canvasId) {
                            slice_index = i;
                        }
                    }
                    var tmpIndex = undoIndex;

                    // update canvas with previous tree in the right canvas
                    if (tmpIndex > 0 && slice_index !== undefined) {
                        undoIndex = undoIndex - 1;
                        var undoAction = undoActionFunc.splice(slice_index, 1)[0];
                        var undoData = undoActionData.splice(slice_index, 1)[0];
                        var undoTreeIdx = undoTreeDataIndex.splice(slice_index, 1)[0];
                        var undoFullTreeD = undoFullTreeData.splice(slice_index, 1)[0];

                    }
                } else { // view mode
                    var tmpIndex = undoIndex;
                    if (tmpIndex > 0) {
                        undoIndex = undoIndex - 1;

                        var undoAction = undoActionFunc.pop();
                        var undoData = undoActionData.pop();
                        var undoTreeIdx = undoTreeDataIndex.pop();
                        var undoFullTreeD = undoFullTreeData.pop();

                    }
                }


                if (undoAction === 'collapse_expand') {
                    if (undoTreeIdx.length === 2) {
                        collapse(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                    } else {
                        collapse(undoData, trees[undoTreeIdx]);
                    }

                }

                if (undoAction === 'collapse_expand_all') {
                    if (undoTreeIdx.length === 2) {
                        collapseAll(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                    } else {
                        collapseAll(undoData, trees[undoTreeIdx]);
                    }
                }

                if (undoAction === 'expand_all') {
                    if (undoTreeIdx.length === 2) {
                        collapseAll(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                    } else {
                        collapseAll(undoData, trees[undoTreeIdx]);
                    }
                }

                if (undoAction === 'reroot') {
                    if (undoTreeIdx.length === 2) {
                        var tree = trees[undoTreeIdx[0]];
                        var comparedTree = trees[undoTreeIdx[1]];
                        var rerootedTree = reroot(tree, undoData);
                    } else {
                        var tree = trees[undoTreeIdx];
                        var rerootedTree = reroot(trees[undoTreeIdx], undoData);
                    }
                    settings.loadingCallback();
                    setTimeout(function () {
                        if (comparedTree) {
                            var index1 = findTreeIndex(tree.name);
                            var index2 = findTreeIndex(comparedTree.name);

                            preprocessTrees(trees[index1], trees[index2]);
                            update(tree.root, rerootedTree.data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(trees[undoTreeIdx].root, rerootedTree.data);
                            settings.loadedCallback();
                        }
                    }, 2);
                }

                if (undoAction === 'swap') {
                    if (undoTreeIdx.length === 2) {
                        rotate(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                        update(trees[undoTreeIdx].root, trees[undoTreeIdx].data);
                    } else {
                        rotate(undoData, trees[undoTreeIdx]);
                        update(trees[undoTreeIdx].root, trees[undoTreeIdx].data);
                    }

                }

                if (undoAction === 'edit') {
                    if (undoTreeIdx.length === 2) {
                        editLabel(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                    } else {
                        editLabel(undoData, trees[undoTreeIdx]);
                    }
                }

                if (undoAction === 'highlight') {
                    if (undoTreeIdx.length === 2) {
                        highlight(undoData, trees[undoTreeIdx[0]], trees[undoTreeIdx[1]]);
                    } else {
                        highlight(undoData, trees[undoTreeIdx]);
                    }
                }

                if (undoAction === 'reset') {
                    alert("unrooted starting tree cannot be rerooted to origin, please re-render")
                }

                if (undoAction === 'restore_branch') {
                    if (undoTreeIdx.length === 2) {
                        var index1 = undoTreeIdx[0];
                        var index2 = undoTreeIdx[1];

                        var comparedTree = trees[index2];
                        var tmp = clone(undoFullTreeD.root);
                        trees[index1].data.root = tmp;
                        trees[index1].root = tmp;
                    } else {
                        var tmp = clone(undoFullTreeD.root);
                        trees[undoTreeIdx].data.root = tmp;
                        trees[undoTreeIdx].root = tmp;
                    }
                    settings.loadingCallback();
                    setTimeout(function () {
                        if (comparedTree) {
                            preprocessTrees(trees[index1].data, comparedTree);
                            update(trees[index1].root, trees[index1].data);
                            update(comparedTree.root, comparedTree.data);
                            settings.loadedCallback();
                        } else {
                            update(trees[undoTreeIdx], trees[undoTreeIdx].data);
                            settings.loadedCallback();
                        }
                    }, 2);
                    settings.loadedCallback();
                }

                if (tmpIndex === 1) {
                    undoActionFunc = [];
                    undoActionData = [];
                    undoTreeDataIndex = [];
                    undoFullTreeData = [];
                }

                $(".undoButton").attr("data-count", undoIndex);

            })



    }

    /*------
     /
     /    SVG export button
     /
     ------*/
    function exportBothTrees(canvasIDLeft, canvasIDRight) {
        var svg = d3.select("#" + canvasIDLeft + " > svg");
        addLogo(svg);

        // Copy left tree
        var svg1 = document.getElementById(canvasIDLeft).getElementsByTagName('svg')[0].cloneNode(true);
        var svg2 = document.getElementById(canvasIDRight).getElementsByTagName('svg')[0].cloneNode(true);
        var colorscale = document.getElementById('colorScale').getElementsByTagName('svg')[0].cloneNode(true);

        // Double the width on svg1
        var l_w = parseInt(svg1.getAttribute('width')),
            r_w = parseInt(svg2.getAttribute('width'));
        svg1.setAttribute('width', (l_w + r_w));
        // Add right tree into left tree's svg
        var g = document.createElement('g');
        var lastElementIndex = svg2.childNodes.length - 3;
        var scaleTextIndex = svg2.childNodes.length - 2;

        if (lastElementIndex > -1) {
            g.setAttribute('transform', 'translate(' + l_w + ',0)');
            main = svg2.childNodes[lastElementIndex];
            scale = svg2.childNodes[scaleTextIndex];
            scaleText = svg2.lastElementChild;

            g.appendChild(main);
            g.appendChild(scale);
            g.appendChild(scaleText);
            g.appendChild(colorscale);

            svg1.appendChild(g);
        }

        svgExport.setAttribute('hreflang', 'image/svg+xml');
        svgExport.setAttribute('href', 'data:image/svg+xml;base64,\n' + btoa(svg1.outerHTML));
        svgExport.setAttribute("download", "Phylo.io-cmp.svg");

        svg.select("#exportLogo").remove();
    }

    function getReport() {
        var concObj = {
            leftPlot: 0,
            rightPlot: 0,
            pVal: 0,
            venn: 0
        }
        var doc = new jsPDF('l', 'cm', 'a4');
        var elementHandler = {
            '#ignorePDF': function (element, renderer) {
                return true;
            }
        };
        canvasId = "vis-container1"

        function getSVGString(svgNode) {
            svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
            var serializer = new XMLSerializer();
            var svgString = serializer.serializeToString(svgNode);
            svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
            svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
            return svgString;
        }

        function getSvg(canvasId) {
            var svg = d3.select("#" + canvasId + " > svg");
            addLogo(svg);
            //console.log("Svg: ", svg);
            //var name = svg.attr("id");
            var svgString = getSVGString(svg.node());
            //var blob = new Blob([svgString], { "type": "image/svg+xml;base64," + btoa(svgString) });
            //saveAs(blob, name + ".svg");
            svg.select("#exportLogo").remove();
            return svgString;
        }

        var svg = getSvg(canvasId)
        //var svg = XMLSerializer.serializeToString(document.getElementById('Tree_0').innerHTML);
        //var svg = document.getElementById('Tree_0').innerHTML
        var canvas = document.createElement('canvas');
        var context = canvas.getContext("2d");

        canvg(canvas, svg);
        var imgData = canvas.toDataURL('image/png');

        doc.setProperties({ title: 'Report' });
        doc.setFontSize(16);
        doc.addImage(imgData, 'PNG', 1, 1, 28, 21)

        doc.addPage('a4', 'p')

        doc.setFontSize(12);
        doc.setFontType("bold");
        doc.text("Common Ancestor: ", 1.5, 2)
 
        var img_plot_1 = document.getElementById('jpg_plot1')
        doc.addImage(img_plot_1, 'PNG', 1, 6, 7.9375, 8.73125)
        var img_plot_2 = document.getElementById('jpg_plot2')
        doc.addImage(img_plot_2, 'PNG', 11, 6, 7.9375, 8.73125)

        var vennSvg = chartSVG
        var venn_canvas = document.createElement('canvas');
        canvg(venn_canvas, vennSvg)
        var venn_img = venn_canvas.toDataURL('image/png');
        doc.addImage(venn_img, 'PNG', 10, 18.5, 8, 4)

        doc.setFontSize(12);
        doc.setFontType('normal');
        var commonAncestor = document.getElementById("ancestor12").value
        doc.text(commonAncestor, 7, 2)

        doc.setFontType("bold");
        doc.text("Identifying differential divergence: ", 1.5, 7)
        doc.text("Internal pair-wise branch length comparison: ", 11.5, 7)
        doc.setFontType('normal');

        doc.text("T-Test Score: ", 1.5, 15)
        doc.text("P-Value\t: ", 1.5, 15.5)
        doc.text("Welch's T-Test Score: ", 1.5, 16)
        doc.text("Welch's P-Value\t: ", 1.5, 16.5)
        doc.text("Paired T-Test Score: ", 1.5, 17)
        doc.text("Paired P-Value\t: ", 1.5, 17.5)
        
        doc.text("T-Test Score: ", 11.5, 15)
        doc.text("P-Value\t: ", 11.5, 15.5)
        doc.text("Welch's T-Test Score: ", 11.5, 16)
        doc.text("Welch's P-Value\t: ", 11.5, 16.5)


        var ttest1 = document.getElementById('ttest1').value
        doc.text(ttest1, 4.5, 15)
        var pval1 = document.getElementById('pval1').value
        doc.text(pval1, 4.5, 15.5)
        var pval_welch_1= document.getElementById('pval_welch_1').value
        doc.text(pval_welch_1, 6.25, 16.5)
        var ttest1_w= document.getElementById('ttest1_w').value
        doc.text(ttest1_w, 6.25, 16)
        var paired_t= document.getElementById('paired_t').value
        doc.text(paired_t, 6.25, 17)
        var pval_paired= document.getElementById('pval_paired').value
        doc.text(pval_paired, 6.25, 17.5)
        var ttest2 = document.getElementById('ttest2').value
        doc.text(ttest2, 14.5, 15)
        var pval2 = document.getElementById('pval2').value
        doc.text(pval2, 14.5, 15.5)
        var ttest2_w = document.getElementById('ttest2_w').value
        doc.text(ttest2, 16.2, 16)
        var pval_welch_2 = document.getElementById('pval_welch_2').value
        doc.text(pval_welch_2, 16.2, 16.5)

        //console.log(meanObj)
        if (pval1 < 0.05) {
            if (meanObj.leftMean1 > meanObj.leftMean2) {
                var text = nameObj.node1 + " has a higher divergence rate than\n" + nameObj.node2 + "."
                doc.text(text, 1.5, 18)
                concObj.leftPlot = 1
            }
            else if (meanObj.leftMean2 > meanObj.leftMean1) {
                var text = nameObj.node2 + " has a higher divergence rate than\n" + nameObj.node1 + "."
                doc.text(text, 1.5, 18)
                concObj.leftPlot = 2
            }
            else {
                doc.text("There is no significant difference between nodes.", 1.5, 18)
                concObj.leftPlot = 3
            }
        }
        else {
            doc.text("There is no significant difference between nodes.", 1.5, 18)
            concObj.leftPlot = 3
        }
        
        if (parseFloat(pval1) < 0.05) {
            //doc.text("-> P-value is smaller than 0.05.",1.5, 16.75)
            concObj.pVal1 = 1
        }
        else {
            //doc.text("-> P-value is larger than 0.05.", 1.5, 16.75)
            concObj.pVal1 = 2
        }
        
        if (pval2 < 0.05) {
            if (meanObj.rightMean1 > meanObj.rightMean2) {
                var text = nameObj.node1 + " is internally more diverge than " + nameObj.node2 + "."
                doc.text(text, 11.5, 17)
                concObj.rightPlot = 1
            }
            else if (meanObj.rightMean2 > meanObj.rightMean1) {
                var text = nameObj.node2 + " is internally more diverge than " + nameObj.node1 + "."
                doc.text(text, 11.5, 17)
                concObj.rightPlot = 2
            }
            else {
                doc.text("There is no significant divergence rate\n between internal nodes.", 11.5, 17)
                concObj.rightPlot = 3
            }
        }
        else {
            doc.text("There is no significant divergence rate\n between internal nodes.", 11.5, 17)
            concObj.rightPlot = 3
        }
        
        if (parseFloat(pval2) < 0.05) {
            //doc.text("-> " +"P-value is smaller than 0.05.", 11.5, 16.75)
            concObj.pVal2 = 1
        }
        else {
            //doc.text("-> " +"P-value is larger than 0.05.", 11.5, 16.75)
            concObj.pVal2 = 2
        }

        doc.setFontType("bold");
        doc.text("RegEX expression:", 1.5, 19.5)
        doc.setFontType('normal');
        var RegEX = document.getElementById('regExSearch').value
        if (!RegEX) RegEX = "taxid_[0-9]+"
        doc.text(RegEX, 5.50, 19.5)
        var regRes = document.getElementById('regRes').value
        doc.text(regRes, 1.5, 20)

        regRes = regRes.split("\n")
        var firstRes = parseInt(regRes[0].split(" ")[7])
        var secondRes = parseInt(regRes[1].split(" ")[7])
        var commonRes = parseInt(regRes[2].split(" ")[8])

        if (commonRes == firstRes) {
            concObj.venn = 1
        }
        else if (commonRes == secondRes) {
            concObj.venn = 2
        }
        else if (commonRes == 0) {
            concObj.venn = 3
        }
        else {
            concObj.venn = 4
        }
        
        doc.save("report.pdf");


      
    }

    function nodeName() {
        if (document.getElementById("node1Name").value) { node1Name = document.getElementById("node1Name").value; }
        else { node1Name = "Node 1" }
        if (document.getElementById("node2Name").value) { node2Name = document.getElementById("node2Name").value; }
        else { node2Name = "Node 2" }
        nameObj.node1 = node1Name;
        nameObj.node2 = node2Name;
        commonAncestor();
    }

    function colorChange() {
        if (document.getElementById('color1').value) { colorObj.color1 = document.getElementById('color1').value }
        else { colorObj.color1 = "#1f77b4" }
        if (document.getElementById('color2').value) { colorObj.color2 = document.getElementById('color2').value }
        else { colorObj.color2 = "#ff7f0e" }
        updateAllRenderedTrees();
        commonAncestor();
    }





    //return all the externalised functions
    return {
        init: init,
        undo: undo,
        inputTreeFile: inputTreeFile,
        viewTree: viewTree,
        renderColorScale: renderColorScale,
        addTree: addTree,
        addTreeGistURL: addTreeGistURL,
        exportTreeToGist: exportTreeToGist,
        exportBothTrees: exportBothTrees,
        removeTree: removeTree,
        getTrees: getTrees,
        compareTrees: compareTrees,
        changeTreeSettings: changeTreeSettings,
        changeCanvasSettings: changeCanvasSettings,
        getMaxAutoCollapse: getMaxAutoCollapse,
        changeAutoCollapseDepth: changeAutoCollapseDepth,
        calcDist: calcDist,
        regexSearch: regexSearch,
        multiSelected: multiSelected,
        purgePlots: purgePlots,
        getReport: getReport,
        nodeName: nodeName,
        colorChange: colorChange,
        trees: trees,
        renderedTrees: renderedTrees,
        multiChildren1: multiChildren1,
        multiChildren2: multiChildren2,
        leavesOne: leavesOne,
        leavesTwo: leavesTwo,
    }
};

//enddd
