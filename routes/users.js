const express = require('express');
const router = express.Router();
const asyncWrapper = require('../utils/asyncWrapper');
const passport = require('passport');
const User = require('../models/user');

// router.route('/register')
//     .get( (req,res) => {
//         res.render('user/register');
//     })
//     .post(asyncWrapper( async(req,res) => {
//         try{
//             const { username, email, password } = req.body;
//             const user = new User({ username, email });
//             const regUser = await User.register(user, password);
//             req.login(regUser, err => {
//                 if(err) return next(err);
//                 req.flash('success', 'Welcome');
//                 res.redirect('/');
//             })
//         } catch(e) {
//             req.flash('error', e.message);
//             return res.redirect('/register');
//         }
//     }));

router.route('/login')
    .get((req,res) => {
        res.render('user/login');
    })
    .post(passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), (req,res) => {
        const redirectUrl = req.session.returnTo || "/";
        delete req.session.returnTo;
        req.flash('success', 'Welcome Back!');
        res.redirect(redirectUrl);
    })

// router.get('/forgot-password', (req,res) => {
//     res.render('user/forgot');
// })

router.get('/logout', (req,res) => {
    req.logout();
    req.flash('success','Successfully logged out!');
    res.redirect('/')
})

module.exports = router;