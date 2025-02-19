const express = require("express")
var busboy = require("connect-busboy") //mid
var path = require("path") //used for file path
var fs = require("fs-extra") //File System - for file manipulationdleware for form/file upload
const app = express()
const port = 3000
const sanitize = require("sanitize-filename")

const cors = require("cors")
app.use(cors())

app.use(express.json())

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
app.get("/api/images/:char_id/:page", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})
app.get("/api/images/:char_id", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})
app.get("/api/images", (req, res) => {
  db.get_images({ ...req.params, ...req.query }).then((images) => {
    res.json(images)
  })
})

app.post(
  "/api/images/upload",
  busboy(), // Add busboy middleware
  async (req, res, next) => {
    try {
      const formData = {}
      let fileProcessed = false
      let fieldsProcessed = false

      req.busboy
        .on("field", (name, val) => {
          formData[name] = val
        })
        .on("file", async (fieldname, file, filename) => {
          try {
            filename = Date.now() + "-" + sanitize(filename)
            await fs.ensureDir(path.join(__dirname, "img"))

            const fullPath = path.join(__dirname, "img", filename)
            const fstream = fs.createWriteStream(fullPath)

            file.pipe(fstream)

            fstream.on("finish", () => {
              res.locals.filename = filename
              fileProcessed = true
              if (fieldsProcessed) next()
            })
          } catch (err) {
            console.error("Upload error:", err)
            res.sendStatus(500)
          }
        })
        .on("close", () => {
          fieldsProcessed = true
          res.locals.formData = formData
          if (fileProcessed) next()
        })

      req.pipe(req.busboy)
    } catch (err) {
      next(err)
    }
  },
  async (req, res) => {
    try {
      const image_url = `/img/${res.locals.filename}`
      const image_data = await db.add_image({
        char_ids: res.locals.formData.char_ids,
        nsfw: !!res.locals.formData.nsfw,
        image_url,
      })
      res.status(201).json(image_data)
    } catch (err) {
      console.error("Database error:", err)
      res.sendStatus(500)
    }
  }
)

db.init_db().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})
