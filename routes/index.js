var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {
  AWS.config.update({ accessKeyId: process.env.awsKey, secretAccessKey: process.env.awsSecret });

  console.log(req.body.image);

  var s3Bucket = new AWS.S3( { params: {Bucket: 'parkcurity'} } );
  s3Bucket.putObject({
      Key: 'image.jpg',
      Body: req.body.image
    },function (err, data) {
      if (err){
        console.log('Error uploading data: ', data);
      }
      else{
        console.log('Successfully uploaded package.');
      }
    })

    res.json({success: true, result: 'photo received'});



});

module.exports = router;
