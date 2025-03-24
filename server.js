const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const path = require('path');

// Initialize express app
const app = express();

// Passport config (assuming you have a config file named 'passport.js')
require('./config/passport')(passport);

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/pg_booking')
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// EJS Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Public folder for static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
// (You can remove `body-parser` from package.json if you use these built-ins)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Express session
app.use(session({
  secret: 'secretkey',
  resave: true,
  saveUninitialized: true
}));
// Connect flash for flash messages
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use('/booking', require('./routes/booking'));
app.use('/pg', require('./routes/pg'));
app.use('/auth', require('./routes/auth'));


// Global variables for flash messages and user
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.error       = req.flash('error');
  // Make user info available in all EJS templates
  res.locals.user        = req.user || null;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/pg', require('./routes/pg'));
app.use('/booking', require('./routes/booking'));

// Home Route
app.get('/', (req, res) => {
  res.render('index');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));