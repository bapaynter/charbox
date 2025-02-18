const express = require("express")
const fs = require("node:fs")
var busboy = require("connect-busboy") //mid
var path = require("path") //used for file path
var fs = require("fs-extra") //File System - for file manipulationdleware for form/file upload
const app = express()
const port = 3000

import * as db from "./sqlite.js"

app.get("/", (req, res) => {
  res.send("Hello World!")
})

// Getting list of characters
app.get("/api/chars", (req, res) => {
  db.get_chars().then((chars) => {
    res.json(chars)
  })
})

// Adding a new character
app.post("/api/chars", (req, res) => {
  const char = req.body
  db.add_char(char).then((success) => {
    if (success) {
      res.status(201).json(char)
    } else {
      res.sendStatus(409)
    }
  })
})

// Getting images with various params
app.get("/api/images", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})
app.get("/api/images/:char_id", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})

app.get("/api/images/:char_id/:page", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})
app.get("/api/images/:char_id/:page/:limit", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})

app.post(
  "/api/images/upload",
  (req, res, next) => {
    var fstream
    req.pipe(req.busboy)
    req.busboy.on("file", function (fieldname, file, filename) {
      filename = Date.now() + filename
      console.log("Uploading: " + filename)

      //Path where image will be uploaded
      fstream = fs.createWriteStream(__dirname + "/img/" + filename)
      file.pipe(fstream)
      fstream.on("close", function () {
        console.log("Upload Finished of " + filename)
        res.locals.filename = filename
        next()
      })
    })
  },
  (req, res) => {
    const image_url = `/img/${res.locals.filename}`
    const success = db.add_image({
      char_ids: req.params.char_ids,
      nsfw: !!req.params.nsfw,
      image_url,
    })
    if (success) {
      res.status(201).json(image_data)
    } else {
      res.sendStatus(409)
    }
  }
)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  db.init_db()
})
