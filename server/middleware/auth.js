const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Check Authorization header first, then fall back to ?token= query param
  const header = req.headers.authorization;
  let token = null;
  
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
