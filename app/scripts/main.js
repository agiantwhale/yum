'use strict';

/* global google */
/* global Solver */

var map = null;
var placesService = null;
var polylinePath = null;
var solver = null;

var routeInterval = null;

var queryCounter = 0;
var queryResults = [];
var queryWatch = null;
var queryTypes = ['cafe', 'restaurant'];

var markers = [];
var windows = [];

function callback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    $.merge(queryResults, results);
  } else {
    console.log(status);
  }
  queryCounter++;
}

function setWindowDetails(infowindow, place) {
  if(infowindow.getContent() === 'Loading...') {
    placesService.getDetails({
      placeId: place.place_id // jshint ignore:line
    }, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        infowindow.setContent(place.name);
      } else {
        console.log(status);
      }
    });
  }
}

function addMarkerListeners(marker, infowindow, place) {
  // Remove the close button.
  google.maps.event.addListener(infowindow, 'domready', function(){
    $('.gm-style-iw').next('div').hide();
  });

  google.maps.event.addListener(marker, 'mouseover', function() {
    setWindowDetails(infowindow, place);
    infowindow.open(map, this);
  });

  google.maps.event.addListener(marker, 'mouseout', function() {
    infowindow.close();
  });
}

function setQueryWatch() {
  queryCounter = 0;
  // Watch for queryCounter to 3
  queryWatch = setInterval(function(){
    if(queryCounter>=queryTypes.length) {
      clearInterval(queryWatch);

      $('#points').text(''+queryResults.length);

      var bounds = new google.maps.LatLngBounds();
      for (var index in queryResults) {
        var place = queryResults[index];
        bounds.extend(place.geometry.location);

        var marker = new google.maps.Marker({
          position: place.geometry.location,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: '#e74c3c',
            strokeColor: '#e74c3c',
          },
        });
        markers.push(marker);

        var infowindow =  new google.maps.InfoWindow({
          content: 'Loading...',
          map: map,
          position: place.geometry.location,
          closeBoxURL: ''
        });
        windows.push(infowindow);
        infowindow.close();


        addMarkerListeners(marker, infowindow, place);
      }

      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);

      startRouting();
    }
  }, 100);
}

function query() {
  // Clear
  for(var mI in markers) {
    var marker = markers[mI];
    marker.setMap(null);
  }
  markers = [];

  for(var wI in windows) {
    var infowindow = windows[wI];
    infowindow.setMap(null);
  }
  windows = [];

  if (polylinePath !== null) {
    polylinePath.setMap(null);
  }

  setQueryWatch();
  placesService = new google.maps.places.PlacesService(map);

  var request = {
    location: new google.maps.LatLng(42.277323, -83.738252), // UMich Diag
    radius: 6000, // 6km
    types: null
  };

  for(var index in queryTypes) {
    request.types=[queryTypes[index]];
    placesService.radarSearch(request, callback);
  }
}

function initializeMap() {
  var mapCanvas = $('#map-canvas');
  var sidebar = $('#sidebar');

	var mapOptions = {
	  center: new google.maps.LatLng(42.277323, -83.738252),
	  zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(mapCanvas[0],mapOptions);

  query();
}
google.maps.event.addDomListener(window, 'load', initializeMap);

function draw(){
  var route = solver.best;
  var routeCoordinates = [];
  for (var index in route) {
      routeCoordinates[index] = queryResults[route[index]].geometry.location;
  }
  //routeCoordinates[route.length] = queryResults[route[0]].geometry.location;

  // Display temp. route
  if (polylinePath !== null) {
      polylinePath.setMap(null);
  }
  var lineSymbol = {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    fillColor: '#e74c3c',
    strokeColor: '#e74c3c',
    fillOpacity: 0.8,
    strokeOpacity: 0.8
  };

  polylinePath = new google.maps.Polyline({
      path: routeCoordinates,
      strokeColor: '#e74c3c',
      strokeOpacity: 1,
      strokeWeight: 4,
      icons: [{
        icon: lineSymbol,
        offset: '100%',
        repeat: '100px'
      }],
  });
  polylinePath.setMap(map);

  $('#gen').text(''+solver.currentGeneration);
  $('#unchanged').text(''+solver.unchangedCount);
  $('#mutate').text(''+solver.mutationCount);
}

function startRouting() { // jshint ignore:line
  solver = new Solver(queryResults, 30);
  solver.initialize();

  routeInterval = setInterval(function(){
    if(solver.unchangedCount>20) {
      clearInterval(routeInterval);
      draw();

      return;
    }

    solver.nextGeneration();

    if(solver.unchangedCount===0)
    {
      draw();
    }

  }, 50);
}


$(document).ready(function(){
  $('#cafes').prop('checked', true);
  $('#restaurants').prop('checked', true);
  $('#bar').prop('checked', false);
  $('#takeouts').prop('checked', false);
  $('#deliveries').prop('checked', false);
  $('#bakeries').prop('checked', false);

  $(':checkbox').change(function() {
    queryTypes = [];
    if($('#cafes').is(':checked')) {
      queryTypes.push('cafe');
    }
    if($('#restaurants').is(':checked')) {
      queryTypes.push('restaurant');
    }
    if($('#bars').is(':checked')) {
      queryTypes.push('bar');
    }
    if($('#takeouts').is(':checked')) {
      queryTypes.push('meal_takeout');
    }
    if($('#deliveries').is(':checked')) {
      queryTypes.push('meal_delivery');
    }
    if($('#bakeries').is(':checked')) {
      queryTypes.push('bakery');
    }

    query();
  });

  $('#wtf-btn').click(function(){
    $('#wtf').modal();
  });
});
