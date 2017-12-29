var template = '<div id="label"></div>'
   + '<div id="wrap">'
   + '  <div id="images"></div>'
   + '  <div id="text"></div>'
   + '</div>'
   + '<div id="source"></div>'

var workingSourceManifest;

function processSelect(){
    $('#output').html(template);
    workingSourceManifest = null;
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
    // making MANY assumptions about structure for simplicity of demo
    // assume it's on a canvas within a manifest
    var refCanvas = resource['on']
    drawCanvasPart(refCanvas)
    drawText(resource);
}

function getCanvasParts(idAndFragment){
    parts = idAndFragment.split('#');
    canvasId = parts[0];
    region = (parts.length == 2) ? parts[1].split('=')[1] : 'full';
    return { canvasId: canvasId, region: region };
}

function drawCanvasPart(refCanvas, size, where, index){
    var parts, manifestId
    if(refCanvas.hasOwnProperty('@id')){
        parts = getCanvasParts(refCanvas['@id'])
        if(refCanvas.hasOwnProperty('within')){
            var manifest = refCanvas['within'];            
            manifestId = manifest.hasOwnProperty('@id') ? manifest['@id'] : manifest;
            workingSourceManifest = manifestId;
        } else {
            manifestId = workingSourceManifest;
        }
    } else {
        parts = getCanvasParts(refCanvas);
        manifestId = workingSourceManifest;
    }
    $.getJSON(manifestId, function(manifest){
        var canvas = getCanvas(manifest, parts.canvasId);
        drawSegment(canvas, parts.region, size, where, index);
        showSource(manifest);
    });
}

function drawText(anno, index){
    if(!index) index = 0;
    var res = anno['resource'];
    if(!res) return;
    if(res['@type'] == 'cnt:ContentAsText'){
        html = '<div class="chars" data-index="' + index + '">' + res['chars'] + '</div>';
        insertForIndex(html, index, '#text')
    }
    if(res['label']){
        $('#label').append('<div class="label">' + res['label'] + '</div>');
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

function insertForIndex(html, index, where){
    // This is NOT the way to do async page building...
    elements = $(where).children('[data-index]');
    if(elements.length == 0){
        $(where).append(html);
        return;
    }
    var insertElement = null;
    for(var i=0; i<elements.length; i++){        
        pos = parseInt($(elements[i]).attr('data-index'));
        if(pos > index){
            break;
        }
        insertElement = $(elements[i]);
    }
    if(insertElement){
        insertElement.after(html);
    } else {        
        $(where).prepend(html);
    }
}



function drawSegment(canvas, region, size, where, index){
    if(!index) index = 0;
    if(!size) size = 'full';
    if(size == 'auto'){
        // totally tweaked for demo...
        width = region.split(',')[2];
        size = (region == 'full' || width < 1500) ? '300,' : '500,'
    }
    if(!where) where = '#images';
    var scaledRegion = getRegionForCanvas(canvas, region);
    var imageSrc = canvas.images[0].resource.service['@id'] + '/' + scaledRegion + '/' + size + '/0/default.jpg';
    html = '<img data-index="' + index + '" src="' + imageSrc + '" />';
    insertForIndex(html, index, where)
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
    $.each(range['canvases'], function (index, canvas){
        drawCanvasPart(canvas, 'auto', '#images', index);
    });
    $.each(range.contentLayer.otherContent, function (annoListIndex, annoListId){
        $.getJSON(annoListId, function(annoList){
            $.each(annoList.resources, function(annoIndex, anno){
                if(anno['motivation'] == 'oa:classifying' && anno['resource']['@id'] == "dctypes:Image"){
                    drawCanvasPart(anno['on'], '200,', '#text', annoListIndex);
                } else {
                    drawText(anno, annoListIndex);
                }
            });
        });
    });
    $('#label').append('<div class="description">' + range['description'] + "</div>");
}
    
function showUV(resource){
    $('#output').css("height", "600px");
    $('#output').html('<iframe src="https://universalviewer.io/examples/uv/uv.html#?manifest=' + resource + '&locales=en-GB:English (GB)" width="100%" height="100%" style="height:100%;width:100%" allowfullscreen frameborder="0"></iframe>');
}

$(function() {
    $('#objects').change(function(){
        processSelect();    
    });
    processSelect();  
});