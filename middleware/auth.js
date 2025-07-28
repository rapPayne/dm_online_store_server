const passport = require('passport');

// JWT Authentication middleware
const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// User ownership middleware (for accessing own resources)
const requireOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'admin') {
    return next(); // Admins can access any resource
  }
  
  if (req.user.id !== resourceUserId) {
    return res.status(403).json({ error: 'Access denied: You can only access your own resources' });
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireOwnership
};