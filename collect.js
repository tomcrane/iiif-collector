var template = '<div id="label"></div>'
   + '<div id="wrap">'
   + '  <div id="images"></div>'
   + '  <div id="text"></div>'
   + '</div>'
   + '<div id="source"></div>'


function processSelect(){
    $('#output').html(template);
    var resource = $('#objects').val()
    $.getJSON(resource, function (iiifResource) {
        $('pre').html(JSON.stringify(iiifResource, null, '  '));
        var type = iiifResource['@type']; 
        if(type == "oa:Annotation"){
            showAnno(iiifResource);
        }
        if(type == "sc:Range"){            
            showRange(iiifResource);
        }
        if(type == "sc:Manifest" || type == "sc:Collection"){
            showUV(resource);
        }
    });
}

function showAnno(resource){
    // making MANY assumptions about structure for simplicity
    // assume it's on a canvas within a manifest
    var refCanvas = resource['on']
    drawCanvasPart(refCanvas)
    drawText(resource);
}

function drawCanvasPart(refCanvas, size, where){
    var idAndFragment = refCanvas['@id'].split('#');
    var canvasId = idAndFragment[0];
    var region = (idAndFragment.length == 2) ? idAndFragment[1].split('=')[1] : 'full';
    console.log(size);
    $.getJSON(refCanvas['within']['@id'], function(manifest){
        var canvas = getCanvas(manifest, idAndFragment[0]);
        drawSegment(canvas, region, size, where);
        showSource(manifest);
    });
}

function drawText(anno){
    var res = anno['resource'];
    if(!res) return;
    if(res['@type'] == 'cnt:ContentAsText'){
        $('#text').append('<div class="chars">' + res['chars'] + "</div>");
    }
    if(res['label']){
        $('#label').append('<div class="label">' + res['label'] + "</div>");
    }
    if(res['@type'] == 'dctypes:Dataset'){
        $('#text').append('<p><b><a href="' + res['@id'] + '">Download dataset (' + res['format'] + ')</a></b></p>');
    }
}

var sources = []
function showSource(manifest){
    if(sources.indexOf(manifest['@id']) == -1){
        sources.push(manifest['@id']);
        $('#source').append('From <a href="' + (manifest['related']['@id'] || manifest['@id']) + '">' + manifest['label'] + '</a><br/>');
    }
}



function drawSegment(canvas, region, size, where){
    if(!size) size = 'full';
    if(!where) where = '#images';
    var scaledRegion = getRegionForCanvas(canvas, region);
    var imageSrc = canvas.images[0].resource.service['@id'] + '/' + scaledRegion + '/' + size + '/0/default.jpg';
    $(where).append('<img src="' + imageSrc + '" />');
}

function getRegionForCanvas(canvas, region){
    // TODO: for now our image services in examples are same size as canvas
    return region;
}

function getCanvas(manifest, canvasId){
    for(var idx = 0; idx < manifest.sequences[0].canvases.length; idx++){
        var canvas = manifest.sequences[0].canvases[idx];
        if(canvas['@id'] == canvasId){
            return canvas;
        }
    } 
    return null;
}

function showRange(range){
    // just going to deal with canvases, no child ranges for simplicity
    $.each(range['canvases'], function (idx, canvas){
        drawCanvasPart(canvas, '300,');
    });
    $.each(range.contentLayer.otherContent, function (idx, annoListId){
        $.getJSON(annoListId, function(annoList){
            $.each(annoList.resources, function(idx, anno){
                if(anno['motivation'] == 'oa:classifying' && anno['resource']['@id'] == "dctypes:Image"){
                    drawCanvasPart(anno['on'], '200,', '#text');
                } else {
                    drawText(anno);
                }
            });
        });
    });
    $('#label').append('<div class="description">' + range['description'] + "</div>");
}
    
function showUV(resource){
    $('#output').css("height", "600px");
    $('#output').html('<iframe src="http://universalviewer.io/examples/uv/uv.html#?manifest=' + resource + '&locales=en-GB:English (GB)" width="100%" height="100%" style="height:100%;width:100%" allowfullscreen frameborder="0"></iframe>');
}

$(function() {
    $('#objects').change(function(){
        processSelect();    
    });
    processSelect();  
});