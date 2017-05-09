var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {
  console.log(req);

    res.json({success: true, result: 'photo received'});



});

module.exports = router;
