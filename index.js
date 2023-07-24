require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const dns = require('dns')
const url = require('url')
const mongoose = require('mongoose')


mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true })

//Serial part
let urlShortenerSerialSchema = mongoose.Schema({
  index: {
    type: Number,
    required: true,
    default: 1
  }
})
let urlShortenerSerial = mongoose.model("urlShortenerSerial", urlShortenerSerialSchema)


const urlSerialInit = (done) => {
  let serial = new urlShortenerSerial({index: 1})
  serial.save(function(err, data) {
    done(err, data)
  })
}
  
const urlIdPick = (done) => {
  urlShortenerSerial.find({}, function(err, data) {
    if (err) console.log(err)
    else done(null, data[0])
  })
}


//Main part
let urlShortenerSchema = mongoose.Schema({
  url: {
    type: String,
    unique: true,
    required: true
  },
  index: {
    type: Number,
    unique: true,
    required: true
  }
})

let urlShortener = mongoose.model("urlShortener", urlShortenerSchema)


const urlFind = (urlWanted, done) => {
  urlShortener.findOne({url: urlWanted}, (err, urlFound) => {
    if (err) done(err)
    else done(null, urlFound)
  })
}

const urlFindById = (urlIdWanted, done) => {
  console.log()
  urlShortener.findOne({index: urlIdWanted}, function(err, urlFound) {
    if (err) done(err)
    else done(null, urlFound)
  })
}

const urlInsertMini = function(urlToInsert, index, done) {
  let urlParsed = new urlShortener({url: urlToInsert, index: index})
  urlParsed.save(function(err, urlInserted) {
    if (err) done(err)
    else {
      urlShortenerSerial.updateOne({index: index}, {index: (index + 1)}, function(err, data) {
        if(err) console.log(err)
      })
      done(null, urlInserted)
    }
  })
}


const urlInsert = function(urlToInsert, done) {
  urlIdPick(function(err, serial) {
    if (err) done(err)
    else {
      if (!serial) {
        urlSerialInit(function(err, data) {
          if (err) console.log(err)
          else urlInsertMini(urlToInsert, data.index, function(err, urlInserted) {
            done(err, urlInserted)
          })
        })
      } else {
        urlInsertMini(urlToInsert, serial.index, function(err, urlInserted) {
            done(err, urlInserted)
          })
      }
      
    }
  })
}


//dns confirm
const dnsLook = (hostname, done) => {
  dns.lookup(hostname, function(err, address, family) {
    done(err)
  })
}


// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

app.use("/api/shorturl", bodyParser.urlencoded({extended: false}))

app.post("/api/shorturl", function(req, res, next) {
  //look if url is valid
  let newUrl = new URL(req.body.url)
  dnsLook(newUrl.hostname, function(err) {
    if (err) res.json({error: "invalid url"})
    else next()
  })
}, function(req, res, next) {
  //look if url is already in DB
  urlFind(req.body.url, function(err, urlFound) {
    if (err || !urlFound) next()
    else res.json({original_url: urlFound.url, short_url: urlFound.index})
  })
}, function(req, res) {
  urlInsert(req.body.url, function(err, urlInserted) {
    console.log("insert")
    if (err) res.json({error: err})
    else res.json({original_url: urlInserted.url, short_url: urlInserted.index})
  })
})

app.get("/api/shorturl/:urlID", function(req, res) {
  urlFindById(req.params.urlID, function(err, urlFound) {
    if (err || !urlFound) res.json({error: "invalid url"})
    else res.redirect(urlFound.url)
  })
})

app.get("/teste", function(req, res) {
  urlIdPick(function(err, serial) {
    if (err) res.json({error: err})
    else {
      if (!serial) {
        urlSerialInit(function(err, data) {
          if (err) console.log(err)
          else res.json({serial: data})
        })
      } else {
        res.json({serial})
      }
    }
  })
})


  // urlShortener.find({}, function(err, data) {
  //   if (err) console.log(err)
  //   else res.json({data})
  // })


// dns.lookup(newUrl.hostname, function(err, address, family) {
// // console.log(err)
// // console.log(address)
// // console.log(family)
// if (err) res.json({error: "invalid url"});
// else res.json({original_url: req.body.url, short_url: 1});
// // if (address) console.log(true);
// // else console.log(false);
// })
