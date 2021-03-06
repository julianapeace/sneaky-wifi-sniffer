var request = require('request')
const env = require('import-env')
var GKEY = process.env.GOOGLE_API_KEY
var DARKSKYKEY = process.env.DARK_SKY_API_KEY
var DB = process.env.DB

// const initOptions = {
//     // global event notification;
//     error: (error, e) => {
//         if (e.cn) {
//             // A connection-related error;
//             //
//             // Connections are reported back with the password hashed,
//             // for safe errors logging, without exposing passwords.
//             console.log('CN:', e.cn);
//             console.log('EVENT:', error.message || error);
//         }
//     }
// };

const axios = require('axios')
const express = require('express')
const nunjucks = require('nunjucks')
const bodyParser = require('body-parser')
const app = express()
const pgp = require('pg-promise')(initOptions);
const db = pgp(DB);
const port = process.env.PORT || 8000;

db.connect()
    .then(obj => {
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });
// create application/json parser
var jsonParser = bodyParser.json()
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// POST /login gets urlencoded bodies


var TEMPLATES_PATH = './views'

nunjucks.configure(TEMPLATES_PATH, {
  autoescape: true,
  express: app
});
//set static folder
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.render('index.html');
})
app.get('/createdb', function(req, res, next){
  var query = 'CREATE TABLE wifipw (id SERIAL NOT NULL, wifi_name TEXT NOT NULL, wifi_password TEXT NOT NULL)'
  db.result(query)
    .then(function(result){
      console.log(result)
    })
    .catch(next)
  res.send('success')
});
app.get('/db', function(req, res, next){
  var query = 'SELECT * FROM wifipw'
  db.any(query)
    .then(function(result){
      console.log(result)
    })
    .catch(next)
});
app.post('/', urlencodedParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)

  // GET LAT/LONG
  var postal_code = req.body.zip
  var google_api = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${postal_code}&key=${GKEY}`;

  axios.get(google_api)
  .then(function (response) {
    var lat = response.data.results[0].geometry.location.lat;
    var long = response.data.results[0].geometry.location.lng;
    return [lat,long]
  })
  .then(function(response){
    var darksky_api = `https://api.darksky.net/forecast/${DARKSKYKEY}/${response[0]},${response[1]}`
    axios.get(darksky_api)
    .then(function(response){
      var minute_summary = response.data.minutely.summary
      var minute_icon = response.data.minutely.icon
      var daily_summary = response.data.daily.summary
      var daily_icon = response.data.daily.icon
      var hourly_summary = response.data.hourly.summary
      var hourly_icon = response.data.hourly.icon
      var currently_summary = response.data.currently.summary
      var currently_icon = response.data.currently.icon
      var currently_temp = response.data.currently.temperature
      //pass it all into html file
      return res.render('response.hbs', {minute_summary: minute_summary, minute_icon: minute_icon, daily_summary:daily_summary, daily_icon:daily_icon, hourly_summary:hourly_summary, hourly_icon:hourly_icon, currently_summary:currently_summary, currently_icon:currently_icon, currently_temp:currently_temp})
    })
  })
  .catch(function (error) {
    console.error(error);
  });


})


app.post('/results', function(req, res, next) {
  const wifiPassword = require('wifi-password');
  wifiPassword()
    .then(password => {
      console.log(password);
  })
    .catch(function(){
      res.redirect('/')
    })
});

app.listen(port, function(){
  console.log('listening on port ' + port)
});
