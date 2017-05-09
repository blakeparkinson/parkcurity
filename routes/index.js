var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {
  AWS.config.update({ accessKeyId: process.env.awsKey, secretAccessKey: process.env.awsSecret });

  var s3 = new AWS.S3();
  s3.client.putObject({
      Bucket: 'parkcurity',
      Key: 'image.jpg',
      Body: req.body.image,
      ACL: 'public-read'
    },function (resp) {
      console.log(resp);
      console.log('Successfully uploaded package.');
    }, function(error){
      console.log(error);
    });

    res.json({success: true, result: 'photo received'});



});

module.exports = router;
