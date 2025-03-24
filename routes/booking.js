const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const PGListing = require('../models/PGListing');

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error_msg', 'Please log in to continue');
  res.redirect('/login');
}

// Book a PG room
router.post('/book/:pgId', ensureAuthenticated, async (req, res) => {
    try {
      const pgListing = await PGListing.findById(req.params.pgId);
      if (!pgListing) {
        req.flash('error_msg', 'PG Listing not found');
        return res.redirect('/');
      }
      // Check if there are available rooms
      if (pgListing.roomsAvailable <= 0) {
        req.flash('error_msg', 'No rooms available for booking');
        return res.redirect('/pg/' + pgListing._id);
      }
  
      // Create booking
      const newBooking = new Booking({
        user: req.user._id,
        pgListing: pgListing._id
      });
      await newBooking.save();
  
      // Decrement available rooms by one
      pgListing.roomsAvailable -= 1;
      await pgListing.save();
  
      req.flash('success_msg', 'Room booked successfully. Please wait for confirmation.');
      res.redirect('/pg/' + pgListing._id);
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error booking room');
      res.redirect('/');
    }
});
  

// Owner can view bookings for their PG listings
router.get('/owner/bookings', ensureAuthenticated, async (req, res) => {
  if (req.user.role !== 'owner') {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/');
  }
  try {
    // Find listings by this owner first, then find bookings for those listings.
    const listings = await PGListing.find({ owner: req.user._id });
    const bookings = await Booking.find({ pgListing: { $in: listings.map(list => list._id) } })
      .populate('user')
      .populate('pgListing');
    res.render('owner-bookings', { bookings });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// GET route to display student's bookings
router.get('/my-bookings', ensureAuthenticated, async (req, res) => {
    try {
      // Find bookings for the current user and populate PG listing details
      const bookings = await Booking.find({ user: req.user._id }).populate('pgListing');
      res.render('student-bookings', { user: req.user, bookings });
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error retrieving your bookings');
      res.redirect('/');
    }
});

// POST route to delete a booking
router.post('/delete/:bookingId', ensureAuthenticated, async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) {
        req.flash('error_msg', 'Booking not found');
        return res.redirect('/booking/my-bookings');
      }
      if (booking.user.toString() !== req.user._id.toString()) {
        req.flash('error_msg', 'Not authorized to delete this booking');
        return res.redirect('/booking/my-bookings');
      }
      
      // Optional: Increment roomsAvailable for the corresponding PG listing if needed
      const pgListing = await PGListing.findById(booking.pgListing);
      if (pgListing) {
        pgListing.roomsAvailable += 1;
        await pgListing.save();
      }
      
      await booking.deleteOne();
      req.flash('success_msg', 'Booking cancelled successfully');
      res.redirect('/booking/my-bookings');
    } catch (err) {
      console.error(err);
      req.flash('error_msg', 'Error cancelling booking');
      res.redirect('/booking/my-bookings');
    }
});
  
module.exports = router;
