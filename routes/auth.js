const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');

// Import User model
const User = require('../models/User');

// Signup Page
router.get('/signup', (req, res) => res.render('signup'));

// Signup Handle
router.post('/signup', async (req, res) => {
  const { username, email, password, password2, role } = req.body;
  let errors = [];

  // Basic validations
  if (!username || !email || !password || !password2) {
    errors.push({ msg: 'Please fill in all fields' });
  }

  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password should be at least 6 characters' });
  }

  if (errors.length > 0) {
    return res.render('signup', { errors, username, email, role });
  } else {
    // Validation passed
    try {
      let user = await User.findOne({ email: email });
      if (user) {
        errors.push({ msg: 'Email is already registered' });
        return res.render('signup', { errors, username, email, role });
      }

      user = new User({ username, email, password, role });
      // Hash Password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      req.flash('success_msg', 'You are now registered and can log in');
      res.redirect('/login');
    } catch (err) {
        // Check for duplicate key error (E11000)
        if (err.code === 11000) {
          let duplicateField = Object.keys(err.keyValue)[0];
          let duplicateValue = err.keyValue[duplicateField];
          req.flash('error_msg', `The ${duplicateField} "${duplicateValue}" is already in use.`);
        } else {
          req.flash('error_msg', 'Something went wrong');
        }
        res.redirect('/signup');
      }
}});

// Login Page
router.get('/login', (req, res) => res.render('login'));

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/pg/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
// Logout Handle
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
      if (err) {
        return next(err);
      }
      req.flash('success_msg', 'You are logged out');
      res.redirect('/login');
    });
  });  

module.exports = router;
