// Utilidades JWT — generar y verificar tokens
const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  // TODO: firmar token con jwt.sign usando JWT_SECRET
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
};

const verifyToken = (token) => {
  // TODO: verificar token con jwt.verify
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
