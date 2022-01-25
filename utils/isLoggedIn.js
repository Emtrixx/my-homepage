

module.exports = (req,res,next) => {
    if(!req.isAuthenticated()) {
        const { id } = req.params;
        req.session.returnTo = req.originalUrl;
        req.flash('error','You need to be logged in!');
        return res.redirect('/login');
    }
    next();
}