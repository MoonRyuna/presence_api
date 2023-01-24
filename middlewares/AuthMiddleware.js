const jwt = require('jsonwebtoken');
const { user } = require("../models")

class AuthMiddleware {
  static async check(req, res, next){
    try {
      const authHeader = req.headers['authorization']
      if(!authHeader){
        return res.json({
          "status": false,
          "message": "token:is null"
        })
      }

      const token = authHeader && authHeader.split(' ')[1]
      
      if(authHeader.split(' ')[0] != 'Bearer') return res.json({
        "status": false,
        "message": "token:is invalid"
      })

      if (token == null) return res.json({
        "status": false,
        "message": "token:is null"
      })

      let auth = await user.findOne({
        where: {
          token: token,
        }
      })
      
      let privateKey = process.env.JWT_PRIVATE_KEY

      if(auth?.username){
        await jwt.verify(token, privateKey, (err, user) => {
          if (err) return res.json({
            "status": false,
            "message": "token:is invalid"
          })

          req.user = user
          next()
        })
      }else{
        return res.json({
          "status": false,
          "message": "user:not found (token invalid)"
        })
      }
    } catch (error) {
      console.log(error)
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }
}

module.exports = AuthMiddleware