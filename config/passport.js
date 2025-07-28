const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const { readDatabase } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Local Strategy for login
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      const db = readDatabase();
      const user = db.users.find(u => u.username === username);
      
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid username or password' });
      }

      // Don't return password in user object
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error);
    }
  }
));

// JWT Strategy for protected routes
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
}, async (payload, done) => {
  try {
    const db = readDatabase();
    const user = db.users.find(u => u.id === payload.id);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    }
    
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

module.exports = { JWT_SECRET };