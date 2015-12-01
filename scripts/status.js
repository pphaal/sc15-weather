// author: InMon Corp.
// version: 1.0
// date: 10/6/2015
// description: SC15 Real-time Weathermap
// copyright: Copyright (c) 2015 InMon Corp.

include(scriptdir() + '/inc/trend.js');

var status = {links:{},nodes:{}};

var trend = new Trend(300,1);

// edit table of links to match SVG map IDs with agents and data sources
var links = {
  'pth1929'  : [{agt:'10.0.0.1', ds:'554'}],
  'pth1985'  : [{agt:'10.0.0.2', ds:'555'}]
};

// use flow metric for faster response time than ifinoctets counter metric
setFlow('sc15_weathermap_bytes', {value:'bytes',filter:'direction=ingress'});
setFlow('sc15_weathermap_stack', {value:'bytes',filter:'direction=ingress',keys:'stack',n:5});

// assign link properties based on utilization
function linkProperties(utilization, down) {
  var color;
  if(down) color = 'black';
  else if(utilization === -1) color = 'gray';
  else if(utilization < 0.1) color = 'dodgerblue';
  else if(utilization < 1) color = 'cyan';
  else if(utilization < 10) color = 'lime';
  else if(utilization < 50) color = 'yellow';
  else color = 'red';
  var props =  {'color':color, 'down': down };
  return props; 
}

var other = '-other-';
setIntervalHandler(function() {
  status = {links:{},nodes:{}};
  var points = {};
  for(var link in links) {
      let {utilization,stack,speed,down} = links[link].reduce(
       function(acc,el) {
         let {agt,ds} = el;
	 let status = metric(agt,ds+'.ifoperstatus')[0].metricValue || "down";
	 if(status === "up") acc.down = false;
         let bytes = metric(agt,ds+'.sc15_weathermap_bytes')[0].metricValue || 0;
         let speed = metric(agt,ds+'.ifspeed')[0].metricValue || 0;
         let utilization = speed ? 800 * bytes / speed : -1;
         if(utilization > acc.utilization) {
           acc.utilization = utilization;
           acc.stack = metric(agt,ds+'.sc15_weathermap_stack')[0].topKeys;
           acc.speed = speed;
         }
         return acc;
       }, {utilization:-1,stack:null,speed:0,down:true});
    status.links[link] = linkProperties(utilization, down);
    let topN = {};
    if(stack && utilization !== -1) { 
      let total = 0;
      for(let i = 0; i < stack.length; i++) {
        let util = speed ? 800 * stack[i].value / speed : 0;
        total += util;
        topN[stack[i].key] = util;
      }
      if(utilization > total) topN[other] = utilization - total;
    }
    points[link] = topN;
  }
  trend.addPoints(points);
},1);

setHttpHandler(function(req) {
  var result, path = req.path;
  if(!path || path.length == 0) throw "not_found";

  switch(path[0]) {
    case 'status':
      result = status;
      break;
    case 'trend':
      if(path.length !== 2) throw "not_found";
      if(!trend.trends[path[1]]) throw "not_found";
      result = {};
      result.times = trend.times;
      result.values = trend.trends[path[1]];
      break;
    default: throw 'not_found'; 
  }
  return result;
});
