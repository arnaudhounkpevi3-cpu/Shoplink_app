function sanitizeUser(user) {
  if (!user) {
    return null
  }

  const { passwordHash: _p, ...safe } = { ...user }
  if (user.id == null && user._id != null) {
    safe.id = String(user._id)
    delete safe._id
  }
  delete safe.__v
  return safe
}

module.exports = { sanitizeUser }
