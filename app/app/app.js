const express = require('express');
const fs = require('fs');
const apiRouter = require('./routes/zomatoMaps');
const http = require('http');
const path = require('path');
const app = express();

const hostname = '127.0.0.1';
const port = 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));
app.use('/public', express.static(__dirname + "/public"));
app.get('/index.html', (req, res) => {
    fs.readFile('index.html', 'utf8', (err,data) => {
        if (err) {
            res.end('Could not find or open file for reading');
        } else {
            res.end(data);
        }
    });
});

app.post('/handler', function (req, res) {
    let location = req.body.location;
    let category = req.body.category;
    let sortby = req.body.sortby
    let numrestaurants = req.body.numrestaurants
    if (category !== '') {
        url_cat = '&category=' + category;
    } else {
        url_cat = '';
    }
    const urlbody = '../restaurants/';
    url = urlbody + 'full?' + 'location=' + location
    + url_cat + '&sortby=' + sortby +
    '&numrestaurants=' + numrestaurants;
    res.redirect(url);    
});
  
app.use('/restaurants?', apiRouter);

app.listen(port, function () {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});
