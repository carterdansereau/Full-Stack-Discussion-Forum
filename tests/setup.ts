import fs from 'fs'
import path from 'path'

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./test.db',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
})

const dbPath = path.join(process.cwd(), 'test.db')
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
}
