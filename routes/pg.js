const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const PGListing = require('../models/PGListing');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error_msg', 'Please log in to view that resource');
  res.redirect('/login');
}

// Dashboard to list owner’s PG listings
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    let listings = [];
    if (req.user.role === 'owner') {
      listings = await PGListing.find({ owner: req.user._id });
    }
    res.render('dashboard', { user: req.user, listings });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Form to add new PG listing (only for owners)
router.get('/add', ensureAuthenticated, (req, res) => {
  if (req.user.role !== 'owner') {
    req.flash('error_msg', 'Only owners can add listings');
    return res.redirect('/pg/dashboard');
  }
  res.render('pg-add');
});

// Handle new PG listing submission
router.post('/add', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
    if (req.user.role !== 'owner') {
      req.flash('error_msg', 'Only owners can add listings');
      return res.redirect('/pg/dashboard');
    }
    try {
      const { title, gender, description, address, wifi, monthlyFees, foodFees, roomsAvailable } = req.body; // include roomsAvailable here
      const images = req.files.map(file => file.filename);
      const newPG = new PGListing({
        owner: req.user._id,
        title,
        gender,
        description,
        address,
        wifi: wifi === 'on' ? true : false,
        monthlyFees,
        foodFees,
        roomsAvailable, // now this value is defined
        images
      });
      await newPG.save();
      req.flash('success_msg', 'PG listing added successfully');
      res.redirect('/pg/dashboard');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error adding listing');
      res.redirect('/pg/add');
    }
  });  

// Search PG listings
router.get('/search', async (req, res) => {
    try {
      const { gender, address } = req.query;
      const query = {};
      if (gender) query.gender = gender;
      if (address) query.address = { $regex: address, $options: 'i' };
      const listings = await PGListing.find(query);
      // Pass req.user (or null if not logged in) to the template
      res.render('pg-search-results', { listings, user: req.user || null });
    } catch (err) {
      console.error(err);
      res.redirect('/');
    }
  });
  

// View PG Listing details
router.get('/:id', async (req, res) => {
    try {
      const listing = await PGListing.findById(req.params.id).populate('owner');
      if (!listing) {
        req.flash('error_msg', 'Listing not found');
        return res.redirect('/');
      }
      // Pass req.user (or null if not logged in) explicitly
      res.render('pg-details', { listing, user: req.user || null });
    } catch (err) {
      console.error(err);
      res.redirect('/');
    }
  });
  

// GET route to show the edit form
router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
    try {
      // Find the listing by id and ensure it belongs to the logged-in owner
      const listing = await PGListing.findById(req.params.id);
      if (!listing) {
        req.flash('error_msg', 'Listing not found');
        return res.redirect('/pg/dashboard');
      }
      if (listing.owner.toString() !== req.user._id.toString()) {
        req.flash('error_msg', 'Not authorized');
        return res.redirect('/pg/dashboard');
      }
      res.render('pg-edit', { listing, user: req.user });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error retrieving listing');
      res.redirect('/pg/dashboard');
    }
});

// POST route to process the edit form submission
router.post('/edit/:id', ensureAuthenticated, upload.array('images', 5), async (req, res) => {
    try {
      // Find the listing to update
      const listing = await PGListing.findById(req.params.id);
      if (!listing) {
        req.flash('error_msg', 'Listing not found');
        return res.redirect('/pg/dashboard');
      }
      if (listing.owner.toString() !== req.user._id.toString()) {
        req.flash('error_msg', 'Not authorized');
        return res.redirect('/pg/dashboard');
      }
  
      // Update fields. If file upload is provided, update images accordingly.
      const { title, gender, description, address, wifi, monthlyFees, foodFees, roomsAvailable } = req.body;
      listing.title = title;
      listing.gender = gender;
      listing.description = description;
      listing.address = address;
      listing.wifi = wifi === 'on';
      listing.monthlyFees = monthlyFees;
      listing.foodFees = foodFees;
      listing.roomsAvailable = roomsAvailable;
  
      // If new images are uploaded, merge them with existing images or replace
      if (req.files && req.files.length > 0) {
        // For example, replace the images. Alternatively, you can merge them.
        listing.images = req.files.map(file => file.filename);
      }
  
      await listing.save();
      req.flash('success_msg', 'Listing updated successfully');
      res.redirect('/pg/dashboard');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error updating listing');
      res.redirect('/pg/dashboard');
    }
});

module.exports = router;