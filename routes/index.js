var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var module_exists = require('module-exists');
var config = require('../config.json');

Image = require( "../models/image" );

var awsKey = config.awsKey ? config.awsKey: process.env.awsKey;
var awsSecret = config.awsSecret? config.awsSecret: process.env.awsSecret;

AWS.config.update({ accessKeyId: awsKey, secretAccessKey: awsSecret, region: 'us-west-2' });

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Parkcurity' });
});

router.get('/photo', (req, res) => {
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var offset = req.query.offset ? parseInt(req.query.offset): 0;

  Image.find(req.query.criteria)
    .sort({'createdAt':-1})
    .limit(limit)
    .skip(offset * limit)
    .exec((err, images) => {

    if (err){

      res.json({error: err});
    }

    else{
      res.json(images);
    }

  })


});

router.get('/photolimit', (req, res) => {

  var hour = req.query.hour? req.query.hour: 24;
    Image.find({createdAt:{$gt:new Date(Date.now() - hour*60*60 * 1000)}}, (err,result)=>{

      if (err){

        res.json({error: err});
      }

     else{
       res.json(result);
      }
    })

});

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
    },function (err, data) {
      if (err){
        res.json({error: 'Failed to upload image to AWS: ' + err});
      }
      else{

        doRecognition(data, (err,resp) =>{

          if (err){

            res.json({error: 'Image Rekognition failed ' + err});


          }
          else{
            if (foundHuman(resp)){

              //save the image to the db
              var image = new Image({
                name: data.key,
                url: data.Location,
                cameraId: req.body.cameraId ? req.body.cameraId : 1
              })

              image.save(function (err, results) {

                if (err){
                  res.json({error: 'Failed to save image: ' + err});
                }
                else{
                  res.json({success: true, result: 'motion detected human'});
                }
              });

            }
            else{

                res.json({success: true, result: 'no human was detected in motion event'});

            }
          }


        })

      }
    })

});

function foundHuman(dataLabels){
  var found = false;
  validEntries = [ 'People', 'Person', 'Human', 'Group', 'Animal']
  for (let label of dataLabels.Labels){
    if (validEntries.indexOf(label.Name)> -1){
      found = true;
      break;
    }
  }

  return found;
}

function doRecognition(data, callback){

  var rek = new AWS.Rekognition();

  var params = {
    Image: {
      S3Object:{
        Bucket: data.Bucket,
        Name: data.key
      }
    },
      MaxLabels: 10,
      MinConfidence: 50
  }
  rek.detectLabels(params, (err, dataLabels) =>{

    if (err){
      
      callback(err);
    }
    else{
      callback(null,dataLabels);
    }
  })

}


module.exports = router;
