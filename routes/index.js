var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var module_exists = require('module-exists');
var config = require('../config.json');

Image = require( "../models/image" );

var awsKey = config.awsKey ? config.awsKey: process.env.awsKey;
var awsSecret = config.awsSecret? config.awsSecret: process.env.awsSecret;

AWS.config.update({ accessKeyId: awsKey, secretAccessKey: awsSecret });

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Parkcurity' });
});

router.get('/photo', (req, res) => {
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var offset = req.query.offset ? parseInt(req.query.offset): 0;

  Image.find(req.query.criteria)
    .limit(limit)
    .skip(offset)
    .exec((err, images) => {

    if (err){

      res.json({error: err});
    }

    else{
      res.json({success: true, result: images});
    }

  })


});

router.post('/photo', (req, res) => {

  var buf = new Buffer(req.body.image, 'base64');
  var s3 = new AWS.S3();

  var timestamp = new Date().getTime().toString();

  //save the image to the db
  var image = new Image({
    name: timestamp,
    url: 'someurl',
    cameraId: 444
  })

  image.save(function (err, results) {

  s3.upload({
    Bucket: 'parkcurity',
      Key: timestamp + '.jpg',
      Body: buf,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    },function (err, data) {
      if (err){
        res.json({error: 'Failed to upload image to AWS: ' + err});
      }
      else{

        //save the image to the db
        var image = new Image({
          name: data.key,
          url: data.Location,
          cameraId: 444
        })

        image.save(function (err, results) {

          if (err){
            res.json({error: 'Failed to save image: ' + err});
          }
          else{
            res.json({success: true, result: 'photo received'});
          }
        });
      }
    })

  });
});

module.exports = router;
