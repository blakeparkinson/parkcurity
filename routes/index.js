var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/photo', (req, res) => {
  console.log(req.body);

    var photo = req.body.photo;


});

module.exports = router;
