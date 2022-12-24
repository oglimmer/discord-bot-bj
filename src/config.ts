import dotenv from 'dotenv'

dotenv.config()

const configObj = {
  clientId: process.env.clientId!,
  token: process.env.token!,
  dbPath: process.env.dbPath!
}

for (const [key, value] of Object.entries(configObj)) {
  if (!value) {
    console.error(`No config found for ${key}. Abort`)
    process.exit(-1)
  }
}

export default configObj
