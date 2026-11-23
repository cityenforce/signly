const jwt = require('jsonwebtoken');

const getAccessSecret = () => {
  return (
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'signly_jwt_access_super_secret_production_key_2026'
  );
};

const getRefreshSecret = () => {
  return (
    process.env.JWT_REFRESH_SECRET ||
    'signly_jwt_refresh_super_secret_production_key_2026'
  );
};

const generateAccessToken = (payload, expiresIn) => {
  const secret = getAccessSecret();
  const options = {
    expiresIn:
      expiresIn ||
      process.env.JWT_ACCESS_EXPIRES_IN ||
      process.env.JWT_EXPIRES_IN ||
      '7d'
  };
  return jwt.sign(payload, secret, options);
};

const generateRefreshToken = (payload, expiresIn) => {
  const secret = getRefreshSecret();
  const options = {
    expiresIn:
      expiresIn ||
      process.env.JWT_REFRESH_EXPIRES_IN ||
      '30d'
  };
  return jwt.sign(payload, secret, options);
};

// Backward-compatible alias
const generateToken = (payload, expiresIn) => {
  return generateAccessToken(payload, expiresIn);
};

const verifyToken = (token) => {
  const secret = getAccessSecret();
  return jwt.verify(token, secret);
};

const verifyRefreshToken = (token) => {
  const secret = getRefreshSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  verifyToken,
  verifyRefreshToken
};
