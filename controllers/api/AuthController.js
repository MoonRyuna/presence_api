const { user } = require("../../models")
const jwt = require('jsonwebtoken')
const Validator = require('validatorjs')
const bcrypt = require('bcryptjs')

class AuthController {
  async auth(req, res) {
    let rules = {
      username: 'required|alpha_dash', 
      password: 'required'
    }

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let { username, password } = req.body

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

      const passwordIsValid = await bcrypt.compare(password, auth?.password);

      if(!passwordIsValid) {
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
        "message": "auth:success",
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

  async desktop_auth(req, res) {
    let rules = {
      username: 'required', 
      password: 'required'
    }

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let { username, password } = req.body

    try {
      let auth = await user.findOne({
        where: {
          username: username,
        }
      })
      
      if(auth?.device_tracker == false) {
        return res.json({
          "status": false,
          "message": "device_tracker:disabled"
        })
      }

      if(!auth?.username){
        return res.json({
          "status": false,
          "message": "username:not found"
        })
      }

      const passwordIsValid = await bcrypt.compare(password, auth?.password);

      if(!passwordIsValid) {
        return res.json({
          "status": false,
          "message": "password:password invalid"
        })
      }

      if(!auth?.token || auth?.token == null){
        return res.json({
          "status": false,
          "message": "token:not found"
        })
      }

      const token = auth?.token

      return res.json({
        "status": true,
        "message": "auth:success",
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