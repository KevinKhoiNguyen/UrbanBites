const express = require('express');
const https = require('https');
const logger = require('morgan');
const router = express.Router();
const axios = require('axios');
var restaurantInfo;
var originLat;
var originLon;
router.use(logger('tiny'));


router.get('/full', (req, res) =>{
    const query = req.query;
    let options = createGoogleGeocodeOptions(query['location']);    
    let url = `https://${options.hostname}${options.path}`;
    axios.get(url)
        .then( (response) => {
            res.writeHead(response.status,{'content-type': 'text/html'});
            return response.data;
        })
        .then( (rsp) => {
            originLat = rsp.results[0].geometry.location.lat;
            originLon = rsp.results[0].geometry.location.lng;
            options = createZomatoSearchOptions(query['numrestaurants'],originLat,originLon,query['sortby'],query['category']);
            url = `https://${options.hostname}${options.path}`;
            const responseZom = axios.get(url);
            return responseZom;
        })
        .then ( (rsp2) => {
            let origin = query['location'];
            numrestaurants = rsp2.data.restaurants.length;
            destinations = [];
            for (let i = 0; i < numrestaurants; i++) {
                destinations.push(rsp2.data.restaurants[i].restaurant.location.address);
            }
            options = createGoogleDistanceOptions(origin, destinations);
            url = `https://${options.hostname}${options.path}`;
            rsp3 = axios.get(url);
            restaurantInfo = rsp2;
            return rsp3;
            
        })
        .then ( (rsp) => {
            markers = JSONParser(restaurantInfo.data, rsp);
            page = createHTMLPage(markers, originLat, originLon);
            res.write(page);
            res.end();
        })
        .catch((error) => {
            console.error(error);
        })
});


const zomatoSearch = {
    method: 'search?',
    api_key: "5f09c60d8d9c87fd036ea4594d6678af",
}

function createZomatoSearchOptions(count,lat,lon,sortby,category) {
    const options = {
        hostname: 'developers.zomato.com',
        port: 443,
        path: '/api/v2.1/',
        method: 'GET'
    }
    if (category !== undefined) {
        url_cat = '&category=' + category;
    } else {
        url_cat = '';
    }

    const str = zomatoSearch.method + 
        'count=' + count +
        '&lat=' + lat +
        '&lon=' + lon +
         url_cat +        
        '&sort' + sortby +'&order=desc' +
        '&apikey=' + zomatoSearch.api_key;
    options.path += str;
    return options; 
}

const googleGeocode = {
    method: 'geocode/',
    api_key: 'AIzaSyAA8F14NddCHCqOtWR9cAH_fFH839KS18Q'
}

function createGoogleGeocodeOptions(query) {
    const options = {
        hostname: 'maps.googleapis.com',
        port: 443,
        path: '/maps/api/',
        method: 'GET'
    }
    const str = googleGeocode.method +
    'json?' +
    'address=' + query +
    '&key=' + googleGeocode.api_key;

    options.path += str;
    return options
}

const googleDistanceMatrix = {
    method: 'distancematrix/',
    api_key: 'AIzaSyAA8F14NddCHCqOtWR9cAH_fFH839KS18Q'
}

function createGoogleDistanceOptions(origin, destinations) {
    const options = {
        hostname: 'maps.googleapis.com',
        port: 443,
        path: '/maps/api/',
        method: 'GET'
    }

    let destination_url = '&destinations=' + destinations[0];
    for (let i = 1; i < destinations.length; i++) {
        destination_url += '|' + destinations[i];
    }

    const str = googleDistanceMatrix.method + 'json?' +
    'units=metric' + 
    '&origins=' + origin +
    destination_url + 'travelmode=walking'+'&key=' + googleDistanceMatrix.api_key;

    options.path += str;
    return options;
}

function JSONParser(zomRsp, googleMapsResponse) {
    let markers = '';
    numrestaurants = zomRsp.restaurants.length;
    for (let i = 0; i <numrestaurants; i++) {
        let name = zomRsp.restaurants[i].restaurant.name;
        let location = zomRsp.restaurants[i].restaurant.location.address;
        let thumb = zomRsp.restaurants[i].restaurant.thumb;
        let url = zomRsp.restaurants[i].restaurant.url;
        let lat = zomRsp.restaurants[i].restaurant.location.latitude;
        let lon = zomRsp.restaurants[i].restaurant.location.longitude;
        let cuisine = zomRsp.restaurants[i].restaurant.cuisines;
        let times = zomRsp.restaurants[i].restaurant.timings;
        let cost = zomRsp.restaurants[i].restaurant.average_cost_for_two;
        let rating = zomRsp.restaurants[i].restaurant.user_rating.aggregate_rating;
        let review1_rating = '';
        let review1_text = '';
        let review1_time = '';
        let reviews = '';
        for (let j = 0; j < 3; j++) {
          
            review1_rating = zomRsp.restaurants[i].restaurant.all_reviews.reviews[j].review.rating;
            review1_text = zomRsp.restaurants[i].restaurant.all_reviews.reviews[j].review.review_text;
            review1_time = zomRsp.restaurants[i].restaurant.all_reviews.reviews[j].review.review_time_friendly;
            
          
          reviews += `<p>User Rating: ${review1_rating} <br>
          ${review1_text}<br>
          <i>Reviewed ${review1_time}</i></p>`;
          
        }
        
        
        let distance = googleMapsResponse.data.rows[0].elements[0].distance.text;
        let travelTime = googleMapsResponse.data.rows[0].elements[0].duration.text;

        content = `<style>.my_text{
            font-family:Tahoma, Geneva, sans-serif; }
            </style>
            <div id="content" class='my_text'>` +
            `<h2>${name}</h2>` +
            `<img src='${thumb}' alt='Restaurant Photo'>` +
            `<div id="bodyContent"></div>` +
            `<p><b>Location:</b> ${location}<br>` +
            `<b>Cuisine:</b> ${cuisine}<br>` +
            `<b>Opening Times:</b> ${times}<br>` +
            `<b>Cost For Two:</b> $${cost}<br>` +
            `<b>Rating:</b> ${rating}<br>` +
            `<b>Distance:</b> ${distance}<br>` +
            `<b>Travel Time:</b> ${travelTime}<br>` +
            `<p><u><b>Reviews</b></u><br>` +
            reviews +
            `<p>Full Review: <a href="${url}">
            https://zomato.com/restuarant=${name}</p>
            </div>
            </div>`;
        location = `${lat}, ${lon}`;
        if (i == (numrestaurants -1)) {
            cell = '[' + "`"+content +"`" + ',' + location + '],' + `["You are here!", ${originLat}, ${originLon}]`;
        } else {
            cell = '[' + "`"+content +"`" + ',' + location + '],';
        }

        markers += cell;            
    }
    return markers;
}

function createHTMLPage(markers, originLat, originLon) {
    str = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="">
    <meta name="author" content="">
    <style>
      /* Always set the map height explicitly to define the size of the div
       * element that contains the map. */
      #map {
        height: 100%;
      }
 
    </style>
    <link rel="icon" href="../public/img/logo.ico">

    <title>UrbanBites</title>

    <!-- Bootstrap core CSS -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">


    <!-- Custom styles for this template -->
    <link href="jumbotron.css" rel="stylesheet">
  </head>

  <body>

    <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
      <a class="navbar-brand" href="#">UrbanBites</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

    </nav>

    <main role="main">

      <!-- Main jumbotron for a primary marketing message or call to action -->
      <div class="jumbotron">
        <div class="container">
          <h1 class="display-3">UrbanBites</h1>
          <p>UrbanBites allows you to find that one restuarant with just a click</p>
          <p>
            <!-- 
            <a class="btn btn-primary btn-lg" href="#" role="button">Learn more &raquo;</a>>\
            -->
            <!-- This form will contain the submission for for the user-->
            <form action="/handler" method="POST">
                <div class="form-row">
                  <div class="col-md-4 mb-3">
                    <label for="validationDefault01">Location</label>
                    <input type="text" name='location' class="form-control" id="validationDefault01" placeholder="Your Location" required>
                  </div>
                  <div class="col-md-2 mb-3"> 
                    <label for="validationDefault02">Category</label>                
                    <select class="custom-select" name='category'>
                      <option selected value="">Select Category:</option>
                      <option value="8">Breakfast</option>
                      <option value="9">Lunch</option>
                      <option value="10">Dinner</option>
                    </select>
                  </div>

                  <div class="col-md-2 mb-3">
                      <label for="validationDefault05">Number of Restaurants</label>
                      <select class="custom-select" name='numrestaurants'>
                          <option selected value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                        </select>   
                  </div>
                  <div class="col-md-2 mb-3">
                    <label for="validationDefault03">Sort By</label>
                    <select class="custom-select" name='sortby'>
                        <option selected value="real_distance">Distance</option>
                        <option value="rating">Rating</option>
                      </select>                  
                  </div>
                </div>
                <button class="btn btn-primary" type="submit" >Search</button>
              </form>
          </p>
        </div>
      </div>

      <!-- This Container Clas will contain the Google Maps View-->
      <div style="width:80%;height:600px; margin: 0 auto; padding: 20px;">
          <div id='map'></div>
        </div>
      <script>

        function initMap() {
          var locations = [` + markers +`];

    var map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: new google.maps.LatLng(${originLat}, ${originLon}),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < locations.length; i++) {  
      if (i == locations.length -1) {
        marker = new google.maps.Marker({
          position: new google.maps.LatLng(locations[i][1], locations[i][2]),
          map: map,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          }
        });
      } else {
        marker = new google.maps.Marker({
          position: new google.maps.LatLng(locations[i][1], locations[i][2]),
          map: map,
        });
      }
      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(locations[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
    }
        }
      </script>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAA8F14NddCHCqOtWR9cAH_fFH839KS18Q&callback=initMap"
      async defer></script>

      <div class="container" style="padding:20px;">
        <!-- Example row of columns -->
        <div class="row">
          <div>
            <p></p>
            <p><a class="btn btn-secondary" href="#" role="button">Search More &raquo;</a></p>
          </div>
        </div>

        <hr>

      </div> <!-- /container -->

    </main>

    <footer class="container">
      <p>&copy; UrbanBites 2018-2019</p>
    </footer>

    <!-- Bootstrap core JavaScript
    ================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
  </body>
</html>`

  return str;
}

const countriesSupported = '';
module.exports = router;

