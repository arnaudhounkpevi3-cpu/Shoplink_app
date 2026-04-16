const mongoose = require('mongoose')

let impl = null
let useMongo = false

function mongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URI
}

async function initRepository() {
  const uri = mongoUri()
  if (uri) {
    const timeoutMs = Number(process.env.MONGODB_SERVER_SELECTION_MS) || 12000
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: timeoutMs,
      })
      useMongo = true
      impl = require('./mongoRepository')
      await impl.seedIfEmpty()
      console.log('✅ MongoDB connecté')
    } catch (err) {
      console.warn('⚠️ MongoDB injoignable — bascule sur le stockage JSON local (data/state.json).')
      console.warn(`   Détail: ${err.message}`)
      console.warn('   Vérifiez Atlas → Network Access, l’URI dans .env, et votre connexion internet.')
      try {
        await mongoose.disconnect()
      } catch (_e) {
        /* ignore */
      }
      useMongo = false
      impl = require('./jsonRepository')
    }
  } else {
    useMongo = false
    impl = require('./jsonRepository')
    console.log('ℹ️  Stockage JSON local (aucune MONGODB_URI / MONGO_URI)')
  }
}

function repo() {
  if (!impl) {
    throw new Error('initRepository() doit être appelé avant le démarrage des routes')
  }
  return impl
}

function isMongo() {
  return useMongo
}

module.exports = {
  initRepository,
  repo,
  isMongo,
  mongoUri,
}
