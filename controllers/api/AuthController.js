const { user } = require("../../models")
const jwt = require('jsonwebtoken')
const Validator = require('validatorjs')
const bcrypt = require('bcryptjs')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

class AuthController {
  async auth(req, res) {
    let rules = {
      username: 'required|alpha_dash', 
      password: 'required',
      imei: 'required'
    }

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let { username, password, imei } = req.body

    try {
      let imeiUsed = await user.findOne({
        where: {
          imei: imei,
          [Op.and]: Sequelize.where(Sequelize.col('username'), {
            [Op.not]: username
          })
        }
      })

      if(imeiUsed){
        return res.json({
          "status": false,
          "message": "imei: sudah tertaut pada akun lain, silakan untuk reset imei"
        })
      }

      let auth = await user.findOne({
        where: {
          username: username,
        }
      })

      if(auth?.imei){
        if(auth?.imei != imei){
          return res.json({
            "status": false,
            "message": "imei: berbeda dengan terakhir kali masuk, silakan untuk reset imei"
          })
        }
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
          "message": "password:not match"
        })
      }

      let payload = {
        username: auth.username,
        createdBy: auth.createdBy,
        updatedBy: auth.updatedBy,
        generate: new Date(),
      }
      
      let token = jwt.sign({ data: payload}, process.env.JWT_PRIVATE_KEY, {
        expiresIn: '24h' 
      });
      
      await user.update({ 
        imei: imei,
        token: token 
      }, {
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
      password: 'required',
      device_uid: 'required',
    }

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let { username, password, device_uid } = req.body

    try {
      let deviceUIDUsed = await user.findOne({
        where: {
          device_uid: device_uid,
          [Op.and]: Sequelize.where(Sequelize.col('username'), {
            [Op.not]: username
          })
        }
      })

      if(deviceUIDUsed){
        return res.json({
          "status": false,
          "message": "device_uid: sudah tertaut pada akun lain, silakan untuk reset device uid"
        })
      }

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

      if(auth?.device_uid){
        if(auth?.device_uid != device_uid){
          return res.json({
            "status": false,
            "message": "device_uid: berbeda dengan terakhir kali masuk, silakan untuk reset device uid"
          })
        }
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

      await user.update({ 
        device_uid: device_uid,
      }, {
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
}

module.exports = AuthController