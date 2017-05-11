var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var module_exists = require('module-exists');
var config = require('../config.json');



Image = require( "../models/image" );

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {

  var awsKey = config.awsKey ? config.awsKey: process.env.awsKey;
  var awsSecret = config.awsSecret? config.awsSecret: process.env.awsSecret;

  AWS.config.update({ accessKeyId: awsKey, secretAccessKey: awsSecret });

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
    },function (err, data) {
      if (err){
        console.log('Error uploading data: ', err);
      }
      else{

        //save the image to the db
        var image = new Image({
          name: data.key,
          url: data.Location,
          cameraId: 444
        })

        image.save(function (err, results) {
          console.log('Successfully uploaded package.');
          res.json({success: true, result: 'photo received'});


        });
      }
    })

});

module.exports = router;
