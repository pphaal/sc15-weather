$(function() { 
  var svgDoc;

  var colors = [
    '#3366cc','#dc3912','#ff9900','#109618','#990099','#0099c6','#dd4477',
    '#66aa00','#b82e2e','#316395','#994499','#22aa99','#aaaa11','#6633cc',
    '#e67300','#8b0707','#651067','#329262','#5574a6','#3b3eac','#b77322',
    '#16d620','#b91383','#f4359e','#9c5935','#a9c413','#2a778d','#668d1c',
    '#bea413','#0c5922','#743411'
  ];

  function setMarkerColor(marker,color) {
    if(!marker) return;
    var match = marker.match('url\\((.*)\\)');
    if(!match) return;
    $(match[1],svgDoc).find('path').attr({'fill':color}); 
  }

  function updateStatus(data) {
    if(!svgDoc) return;

    var links = data.links;
    for(var link in links) {
      var linkObj = $('#'+link,svgDoc);
      linkObj.data('hasStatus',true).css({'cursor':'pointer'});
      var props = links[link];
      if(props.color) {
	//console.log("setting color for link: " + link + " to " + props.color);
        linkObj.css({'stroke':props.color});
        setMarkerColor(linkObj.css('marker-start'),props.color);
        setMarkerColor(linkObj.css('marker-mid'),props.color);
        setMarkerColor(linkObj.css('marker-end'),props.color);
        setMarkerColor(linkObj.css('marker'),props.color);
      }
      if(props.width) linkObj.css({'stroke-width':props.width});

      if(props.down) {
	  var dimension = parseInt(linkObj.css('stroke-width'));
	  dimension *= 2;
	  linkObj.css({'stroke-dasharray': ("" + dimension + "," + dimension)});
      }
      else linkObj.css({'stroke-dasharray': "none"});
    }

    var nodes = data.nodes;
    for(var node in nodes) {
      var nodeObj = $('#'+node,svgDoc);
      var props = nodes[node];
      if(props.color) nodeObj.css({'fill':props.color});
    }
  }

  function pollStatus() {
    $.ajax({
      url: '../scripts/status.js/status/json',
      success: function(data) {
        updateStatus(data);
        setTimeout(pollStatus, 1000);
      },
      error: function(result,status,errorThrown) {
        setTimeout(pollStatus, 5000);
      },
      timeout: 60000
   });
  }

  var chartRunning = false;
  var chartTimeout = null;
  var chartID = null;
  var db = {};
  function chartPoll() {
     chartRunning = true;
     $.ajax({
       url:'../scripts/status.js/trend/'+chartID+'/json',
       success: function(data) {
         db.trend = {times:data.times,trends:{utilization:data.values}};
         $.event.trigger({type:'updateChart'});
         chartTimeout = setTimeout(chartPoll,1000);
       },
       error: function() {
         chartTimeout = setTimeout(chartPoll,5000);
       }
    });
  }

  function stopChartPoll() {
     chartRunning = false;
     if(chartTimeout) clearTimeout(chartTimeout);
  }

  function linkClick(id) {
    chartID = id;
    $('#dialog').dialog("open");
    $('.ui-dialog :button').blur();
  }

  $(document).ready(function() {
    $('#stripchart').chart({
      type:'topn',
      stack:true,
      legendHeadings:['Protocol Stack'],
      metric:'utilization',
      colors: colors,
      backgroundColor:'white',
      units:'%Utilization'
    },db);
    $('#dialog').dialog({
      modal:true,
      autoOpen:false,
      width:600,
      height:260,
      open: chartPoll,
      beforeClose: stopChartPoll
    });
    pollStatus();
  });

  document.getElementById('svgObj').addEventListener('load', function() {
    svgDoc = $(document.getElementById('svgObj').contentDocument);
    $('path',svgDoc)
      .attr('id', function(idx) { return 'pth'+idx; })
      .css({'stroke':'gray'})
      .click(function(evt) {
         console.log('click='+evt.target.id);
         if($(evt.target).data('hasStatus')) linkClick(evt.target.id);
      });
  }, true); 
});
