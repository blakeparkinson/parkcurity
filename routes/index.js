var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {
  AWS.config.update({ accessKeyId: process.env.awsKey, secretAccessKey: process.env.awsSecret });

  var buf = new Buffer(req.body.image, 'base64');
  var s3 = new AWS.S3();

  var timestamp = new Date().getTime().toString();



  s3.putObject({
    Bucket: 'parkcurity',
      Key: timestamp + '.jpg',
      Body: buf,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg',
      ACL: 'public-read'
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
