import sqlite3 from "sqlite3"

// connection helpers
let dbInstance = null
export const getDB = async () => {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(
      "charbox.db",
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    )
    await execute(dbInstance, "PRAGMA foreign_keys = ON;")
  }
  return dbInstance
}

const withDB = async (operation) => {
  const db = await getDB() // Reused connection
  try {
    return await operation(db)
  } finally {
    // Optionally close if needed
  }
}

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
const get_chars = async () =>
  withDB((db) => fetchAll(db, "SELECT * FROM chars"))

// Add a character to the database
const add_char = async (args) =>
  withDB((db) =>
    execute(db, `INSERT INTO chars (name) VALUES (?)`, [args.name])
  )

// Get paginated images with optional nsfw filter
const get_images = async (args) =>
  withDB((db) => {
    let query = `SELECT * FROM pictures`
    if (!args.nsfw) {
      query += ` WHERE nsfw=0`
    }
    query += " LIMIT ? OFFSET ?"
    fetchAll(db, query, [
      args.limit || 50,
      args.page ? args.page * (args.limit || 50) : 0,
    ])
  })

// Get images for a specific character

const get_images_for_char = async (args) =>
  withDB((db) => {
    let query = `SELECT * FROM pictures JOIN chars_pictures ON pictures.id=chars_pictures.picture_id WHERE chars_pictures.char_id=?`
    if (!args.nsfw) {
      query += ` AND nsfw=0`
    }
    query += " LIMIT ? OFFSET ?"
    fetchAll(db, query, [
      args.char_id,
      args.limit || 50,
      args.page ? args.page * (args.limit || 50) : 0,
    ])
  })

const add_image = async (args) =>
  withDB(async (db) => {
    const picture_id = await execute(
      db,
      `INSERT INTO pictures (
        name, nsfw, url
      ) VALUES (?, ?, ?)`,
      [args.name, args.nsfw ? 1 : 0, args.image_url]
    )
    await execute(
      db,
      `INSERT INTO chars_pictures (char_id, picture_id) VALUES ${args.char_ids
        .map(() => "(?, ?)")
        .join(",")}`,
      args.char_ids.flatMap((id) => [id, picture_id])
    )
  })
export default {
  get_chars,
  add_char,
  get_images,
  get_images_for_char,
  add_image,
  init_db,
}
