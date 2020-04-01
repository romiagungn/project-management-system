// configure helpers
const helpers = {
    isLoggedIn: (req, res, next) => {
        if (req.session.user) {
            next();
        } else {
            res.redirect("/");
        }
    },
    isAdmin: (req, res, next) => {
        if(req.session.user.isfulltime) {
            console.log(req.session.user.isfulltime)
            next();
        } else {
            req.flash('permissionMessage', 'Permission Denied')
            res.redirect("/projects")
        }
    }
}

module.exports = helpers;