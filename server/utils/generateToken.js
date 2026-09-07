const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');

function signAuthToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Long, unguessable, URL-safe token for customer-facing order links.
function generateCustomerToken() {
  return nanoid(40);
}

module.exports = { signAuthToken, generateCustomerToken };
