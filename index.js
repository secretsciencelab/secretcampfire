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
  res.send(JSON.stringify({ 
    'path': 'feed',
    'params': req.params
  }));
})

app.get('/post/:id', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ 
    'path': 'post',
    'params': req.params
  }));
})

app.get('/dashboard/:index?', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ 
    'path': 'dashboard',
    'params': req.params
  }));
})

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
