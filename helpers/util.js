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
        if(req.session.user.isadmin) {
            console.log(req.session.user.isadmin)
            next();
        } else {
            req.flash('permissionMessage', 'Permission Denied')
            res.redirect("/projects")
        }
    }
}

module.exports = helpers;