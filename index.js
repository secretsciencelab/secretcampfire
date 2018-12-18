const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express()

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))


app.get('/feed/:index?', function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  var testJson = 
  {
    "name": "Secret Feed",
    "posts": [
      {
        "title": "Abyssinian Kitten",
        "date": "2018-12-16T18:25:43.511Z",
        "thumbs": ["https://preview.redd.it/4h5hma8azj421.jpg?width=640&crop=smart&auto=webp&s=07256bd9735d9bf50e73db311582ada62f73e7a8"],
        "urls": ["https://i.redd.it/4h5hma8azj421.jpg"],
        "text": "",
        "tags": ["cat"],
        "post_url": "http://instance/post/id",
        "re_url": "http://reblogged_from_instance/post/id"
      },
      {
        "title": "Beary good ball control",
        "date": "2018-12-15T18:25:43.511Z",
        "thumbs": ["https://preview.redd.it/l2tt5oue5r421.jpg?width=960&crop=smart&auto=webp&s=4f26e7362888fa5ac8647da4984cad0cbd9e7850"],
        "urls": ["https://i.redd.it/l2tt5oue5r421.jpg"],
        "text": "",
        "tags": ["bear"],
        "post_url": "http://instance/post/id",
        "re_url": "http://reblogged_from_instance/post/id"
      },
      {
        "title": "Right after I said no more treats!",
        "date": "2018-12-14T18:25:43.511Z",
        "thumbs": ["https://preview.redd.it/px7dci9jgw421.jpg?width=640&crop=smart&auto=webp&s=25f2d67b65b865074c5eef48c1066fef34202cc1"],
        "urls": ["https://i.redd.it/px7dci9jgw421.jpg"],
        "text": "",
        "tags": ["bunny"],
        "post_url": "/post/id",
        "re_url": "http://reblogged_from_instance/post/id"
      }
    ],
    "style": "/stylesheets/feed.css"
  }
  res.send(JSON.stringify(testJson));

	//if (req.params['index'] > 1)
	//{
  //	res.send(JSON.stringify({}));
  //  return;
  //}
})

app.get('/post/:id', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ 
    'path': 'post',
    'params': req.params
  }));
})

app.get('/render/:uri', function (req, res) {
  res.render('pages/render', {
    'uri': req.params['uri']
  });
})

app.get('/dashboard/:index?', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ 
    'path': 'dashboard',
    'params': req.params
  }));
})

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
