import sqlite3 from "sqlite3"

// Helper functions for sqlite
export const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      resolve(rows)
    })
  })
}

export const fetchFirst = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      resolve(row)
    })
  })
}

const execute = async (db, sql, params = []) => {
  if (params && params.length > 0) {
    return new Promise((resolve, reject) => {
      var stmt = db.prepare(sql)
      stmt.run(params, (err) => {
        if (err) reject(err)
        resolve(stmt.lastID)
      })
    })
  }
  return new Promise((resolve, reject) => {
    var stmt = db.prepare(sql)
    stmt.run((err) => {
      if (err) reject(err)
      resolve(stmt.lastID)
    })
  })
}

// Initialize the database
const init_db = async () => {
  const db = new sqlite3.Database(
    "charbox.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
  )
  try {
    await execute(
      db,
      `CREATE TABLE IF NOT EXISTS chars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`
    )
    await execute(
      db,
      `CREATE TABLE IF NOT EXISTS pictures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL,
        nsfw BOOLEAN DEFAULT FALSE
      )`
    )
    await execute(
      db,
      `CREATE TABLE IF NOT EXISTS chars_pictures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        char_id INTEGER NOT NULL REFERENCES chars(id),
        picture_id INTEGER NOT NULL REFERENCES pictures(id)
      )`
    )
    await execute(db, "PRAGMA foreign_keys = ON;")
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close()
  }
}

// Get all characters
const get_chars = async () => {
  const db = new sqlite3.Database("charbox.db", sqlite3.OPEN_READWRITE)
  try {
    return await fetchAll(db, "SELECT * FROM chars")
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close()
  }
}

// Add a character to the database
const add_char = async (args) => {
  const db = new sqlite3.Database("charbox.db", sqlite3.OPEN_READWRITE)
  try {
    await execute(db, `INSERT INTO chars (name) VALUES (?)`, [args.name])
    return true
  } catch (error) {
    console.error(error)
    if (error.message.includes("UNIQUE")) {
      throw new Error("Name already exists")
    }
    throw error
  } finally {
    db.close()
  }
}

// Get paginated images with optional nsfw filter
const get_images = async (args) => {
  const db = new sqlite3.Database("charbox.db", sqlite3.OPEN_READWRITE)
  let query = `SELECT * FROM pictures`
  if (!args.nsfw) {
    query += ` WHERE nsfw=0`
  }
  query += " LIMIT ? OFFSET ?"
  try {
    return await fetchAll(db, query, [
      args.limit || 50,
      args.page ? args.page * (args.limit || 50) : 0,
    ])
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close()
  }
}

// Get images for a specific character
const get_images_for_char = async (args) => {
  if (!args.char_id) throw new Error("char_id is required")
  const db = new sqlite3.Database("charbox.db", sqlite3.OPEN_READWRITE)
  let query = `SELECT * FROM pictures JOIN chars_pictures ON pictures.id=chars_pictures.picture_id WHERE chars_pictures.char_id=?`
  if (!args.nsfw) {
    query = ` AND nsfw=0`
  }
  query += " LIMIT ? OFFSET ?"
  try {
    return await fetchAll(db, query, [
      args.char_id,
      args.limit || 50,
      args.page ? args.page * (args.limit || 50) : 0,
    ])
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close()
  }
}

const add_image = async (args) => {
  const db = new sqlite3.Database("charbox.db", sqlite3.OPEN_READWRITE)
  try {
    const picture_id = await execute(
      db,
      `INSERT INTO pictures (
        name, nsfw, url
      ) VALUES (?, ?, ?)`,
      [args.name, args.nsfw ? 1 : 0, args.image_url]
    )
    for (const char_id of args.char_ids) {
      await execute(
        db,
        `INSERT INTO chars_pictures (
        char_id, picture_id
      ) VALUES (?, ?)`,
        [char_id, picture_id]
      )
    }

    return true
  } catch (error) {
    console.error(error)
    if (error.message.includes("UNIQUE")) {
      throw new Error("Name already exists")
    }
    throw error
  } finally {
    db.close()
  }
}

export default {
  get_chars,
  add_char,
  get_images,
  get_images_for_char,
  add_image,
  init_db,
}
