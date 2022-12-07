const { user } = require("../../models")
const jwt = require('jsonwebtoken');

class AuthController {
  async auth(req, res) {
    let { username, password } = req.body

    if(!username){
      return res.json({
        "status": false,
        "message": "username:must not be blank"
      })
    }

    if(!password){
      return res.json({
        "status": false,
        "message": "password:must not be blank"
      })
    }

    try {
      let auth = await user.findOne({
        where: {
          username: username,
        }
      })
  
      if(!auth?.username){
        return res.json({
          "status": false,
          "message": "username:not found"
        })
      }

      if(password != auth.password){
        return res.json({
          "status": false,
          "message": "password:not match"
        })
      }

      let payload = {
        username: auth.username,
        createdBy: auth.createdBy,
        updatedBy: auth.updatedBy,
        generate: new Date(),
        token: 'JsonWebToken',
        expiresIn: '24'
      }
      
      let token = jwt.sign({ data: payload}, process.env.JWT_PRIVATE_KEY, { 
        expiresIn: '24h' 
      });
      
      await user.update({ token: token }, {
        where: { id: auth?.id }
      })

      return res.json({
        "status": true,
        "message": "Approve",
        "data": {
          "token": token
        }
      })

    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }
}

module.exports = AuthController