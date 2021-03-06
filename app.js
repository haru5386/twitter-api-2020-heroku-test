const express = require('express')
const helpers = require('./_helpers')
const bodyParser = require('body-parser')

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express()

const passport = require('./config/passport')

const port = process.env.PORT || 3000



// use helpers.getUser(req) to replace req.user
function authenticated(req, res, next) {
  // passport.authenticate('jwt', { ses...
};

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.json())
app.use(passport.initialize())
app.use('/upload', express.static(__dirname + '/upload'))
require('./routes')(app)

app.use((err, req, res, next) => {
  res.status(422).json({
    status: 'error',
    message: err.message
  })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app
