import dotenv from 'dotenv'

dotenv.config()

const configObj = {
  clientId: process.env.clientId!,
  token: process.env.token!,
  dbPath: process.env.dbPath!
}

let missingConfigInfo = ''
for (const [key, value] of Object.entries(configObj)) {
  if (!value) {
    missingConfigInfo += `No config found for ${key}. `
  }
}
if (missingConfigInfo) {
  console.error(`${missingConfigInfo}Abort.`)
  process.exit(0)
}

export default configObj
