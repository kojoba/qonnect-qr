const jwt = require("jsonwebtoken")
const {errorResponse} = require("../utils/response")

function protect(req, res, next){
    try{
        const authHeader = req.headers.authorization

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return errorResponse(res, "Not authorized", 401)
        }

        const token = authHeader.split(" ")[1]

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = decoded
        next()
    }
    catch (error){
        return errorResponse(res, "Invalid or expired token", 401)
    }
}

function authorize(...roles){
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)){
            return errorResponse(res, "Forbidden", 403)
        }
        next()
    }
}

module.exports = {
    protect,
    authorize,
}