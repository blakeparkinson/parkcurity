var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var module_exists = require('module-exists');
var querystring = require('querystring');
var config = require('../config.json');
var request = require('request');
var cors = require('cors');

const Shopify = require('shopify-api-node');

const shopName = config.shopName ? config.shopName : process.env.shopName;
const shopApiKey = config.shopApiKey ? config.shopApiKey : process.env.shopApiKey;
const shopPass = config.shopPass ? config.shopPass : process.env.shopPass;



const shopify = new Shopify({
  shopName: shopName,
  apiKey: shopApiKey,
  password: shopPass
});

Image = require("../models/image");
Motion = require("../models/motion");
Token = require("../models/token");


var awsKey = config.awsKey ? config.awsKey : process.env.awsKey;
var awsSecret = config.awsSecret ? config.awsSecret : process.env.awsSecret;

AWS.config.update({ accessKeyId: awsKey, secretAccessKey: awsSecret, region: 'us-west-2' });

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Parkcurity' });
});

// router.use( '*', authenticate );

function authenticate(req, res, next) {

  if (!req.headers || !req.headers.authentication) {
    res.status(401).json({
      status: 'error',
      title: 'Missing Token'
    });
  }
  else {

    var authentication = config.authentication ? config.authentication : process.env.authentication;

    if (req.headers.authentication != authentication) {
      res.status(401).json({
        status: 'error',
        title: 'Invalid Token'
      });
    }

    else {
      next();
    }
  }

}



router.get('/photo', (req, res) => {
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var offset = req.query.offset ? parseInt(req.query.offset) : 0;

  Image.find(req.query.criteria)
    .sort({ 'createdAt': -1 })
    .limit(limit)
    .skip(offset * limit)
    .exec((err, images) => {

      if (err) {

        res.json({ error: err });
      }

      else {
        res.json(images);
      }

    })


});

router.get('/motion', (req, res) => {
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var offset = req.query.offset ? parseInt(req.query.offset) : 0;

  Motion.find(req.query.criteria)
    .sort({ 'createdAt': -1 })
    .limit(limit)
    .skip(offset * limit)
    .exec((err, images) => {

      if (err) {

        res.json({ error: err });
      }

      else {
        res.json(images);
      }

    })


});

router.get('/shopify', (req, res) => {
  shopify.products.list({ limit: 550 })
    .then(orders => console.log(orders))
    .catch(err => console.error(err));
});

router.get('/photo/:id', (req, res) => {
  Image.findById(req.params.id, (err, result) => {
    if (err) {

      res.json({ error: err });

    }
    else {
      res.json(result);
    }
  });
});


router.get('/photolimit', (req, res) => {

  var hour = req.query.hour ? req.query.hour : 24;
  Image.find({ createdAt: { $gt: new Date(Date.now() - hour * 60 * 60 * 1000) } }, (err, result) => {

    if (err) {

      res.json({ error: err });
    }

    else {
      res.json(result);
    }
  })

});

router.post('/token', saveToken);

router.post('/image', waifu)

router.post('/product', cors(), (req, res) => {
  console.log(req.body)
  const token = req.body.bbtoken;
  delete req.body.token
  request.post({
    headers: {
      'authentication': token
    },
    url: 'https://staging.backboneapp.co/api/v1/models/Object',
    body: req.body,
    json: true
  }, function (err, response, body) {

    res.json(response.body)
  });

})


function saveToken(req, res) {
  if (req.body.token && req.body.os) {
    var token = new Token({
      token: req.body.token,
      os: req.body.os
    });
    token.save((err, result) => {
      if (err) {
        res.json({ error: err });
      }
      else {
        res.json(result);
      }
    });
  }


  else {

    res.json({ error: 'Missing required fields' });

  }

}

function waifu(imgUrl, cb) {
  var formData = {
    image: imgUrl
  };
  request.post({
    headers: {
      'Api-Key': '5f8e80bb-352b-49d9-8cdf-01d65da30935'
    },
    url: 'https://api.deepai.org/api/waifu2x',
    formData: formData
  }, function (err, response, body) {
    var response = JSON.parse(body);

    cb(response);
  });
}

function sendNotification(imageResult) {

  Token.find({}, (err, result) => {
    for (let tokenRecord of result) {

      var requestBody = {
        token: tokenRecord.token,
        alert: `Motion was detected on camera: ${imageResult.cameraId}`,
        payload: {
          imageId: imageResult._id
        },
        topic: 'com.parkcurity.app',
        secret_sauce: 'glassenberg'

      };

      var options = {
        method: 'post',
        body: requestBody,
        json: true,
        url: 'https://apn-push.herokuapp.com/apn'
      }


      request(options, (err, res, body) => {


      });
    }

  });
}

router.post('/photo', (req, res) => {

  var buf = new Buffer(req.body.image, 'base64');
  var s3 = new AWS.S3();

  var timestamp = new Date().getTime().toString();

  s3.upload({
    Bucket: 'parkcurity',
    Key: timestamp + '.jpg',
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  }, function (err, data) {
    if (err) {
      res.json({ error: 'Failed to upload image to AWS: ' + err });
    }
    else {

      doRecognition(data, (err, resp) => {

        if (err) {

          res.json({ error: 'Image Rekognition failed ' + err });


        }
        else {
          if (foundHuman(resp)) {

            waifu(data.Location, (response) => {

              //save the image to the db
              var image = new Image({
                name: data.key,
                url: response.output_url,
                cameraId: req.body.cameraId ? req.body.cameraId : 1,
                labels: resp.Labels
              })

              image.save((err, imageResult) => {

                if (err) {
                  res.json({ error: 'Failed to save image: ' + err });
                }
                else {
                  sendNotification(imageResult);
                  res.json({ success: true, result: 'motion detected human', data: imageResult });
                }
              });
            })
          }
          else {
            var motion = new Motion({
              name: data.key,
              url: data.Location,
              cameraId: req.body.cameraId ? req.body.cameraId : 1,
              labels: resp.Labels

            });

            motion.save(function (err, motionResult) {

              if (err) {
                res.json({ error: 'Failed to save motion: ' + err });
              }
              else {
                res.json({ success: true, result: 'no human was detected in motion event', found: resp });

              }
            });

          }
        }

      })

    }
  })

});

function foundHuman(dataLabels) {
  var found = false;
  validEntries = ['People', 'Person', 'Human', 'Group', 'Animal', 'Silhouette'];
  for (let label of dataLabels.Labels) {
    if (validEntries.indexOf(label.Name) > -1) {
      found = true;
      break;
    }
  }

  return found;
}

function doRecognition(data, callback) {

  var rek = new AWS.Rekognition();

  var params = {
    Image: {
      S3Object: {
        Bucket: data.Bucket,
        Name: data.key
      }
    },
    MaxLabels: 15,
    MinConfidence: 30
  }
  rek.detectLabels(params, (err, dataLabels) => {

    if (err) {

      callback(err);
    }
    else {
      callback(null, dataLabels);
    }
  })

}


module.exports = router;
