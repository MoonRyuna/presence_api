const { user } = require("../../models")
const Validator = require('validatorjs')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const fs = require('fs')

class UserController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if(req.query.name) qWhere.name = { [Op.iLike]: `%${req.query.name}%` }
      if(req.query.user_code) qWhere.user_code = { [Op.iLike]: `%${req.query.user_code}%` }
      if(req.query.deleted) qWhere.deleted = req.query.deleted

      let qOrder = []
      if(req.query.order != undefined){
        let order = req.query.order.split(',')
        order = order.split(',')
        if(order.length > 0){
          order.forEach((o) => {
            let obj = o.split(':')
            if(obj.length > 0) {
              if(obj[1] == 'ASC' || obj[1] == 'DESC') qOrder.push([obj[0], obj[1]])
            }
          })
        }
      }

      qRes = await user.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
      })

      let next_res = await user.count({
        where: qWhere,
        offset: offset + limit,
        limit: limit
      })

      let current_page = page
      let prev_page = page > 1 ? page - 1 : null
      let next_page = next_res > 0 ? page : null
      let total = await user.count({ where: qWhere })

      return res.json({
        "status": true,
        "message": "user:success",
        "data": {
          "total": total,
          "current_page": current_page,
          "next_page": next_page,
          "prev_page": prev_page,
          "result": qRes,
        }
      })
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }        
  }

  async findById(req, res) {
    try {
      let qRes = await user.findOne({
        where: { id: req.params.id }
      })
      return res.json({
        "status": true,
        "message": "user:success",
        "data": qRes
      })
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async create(req, res) {
    let rules = {
      user_code: "required",
      username: "required",
      password: "required",
      token: "required",
      email: "required",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
      profile_picture: "required",
      device_tracker: "required",
      created_by: "required",
    }     

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let {
      user_code,
      username,
      password,
      token,
      email,
      account_type,
      name,
      address,
      description,
      started_work_at,
      profile_picture,
      device_tracker,
      created_by
    } = req.body

    try{
      let qRes = await user.create({
        user_code: user_code,
        username: username,
        password: await bcrypt.hash(password, saltRounds),
        token: token,
        email: email,
        account_type: account_type,
        name: name,
        address: address,
        description: description,
        started_work_at: started_work_at,
        profile_picture: profile_picture,
        device_tracker: device_tracker,
        created_by: created_by,
        deleted: 0,
      })
      
      return res.json({
        "status": true,
        "message": "user:success",
        "data": qRes
      })
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async update(req, res) {
    let rules = {
      user_code: "required",
      username: "required",
      token: "required",
      email: "required",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
      profile_picture: "required",
      device_tracker: "required",
      updated_by: "required",
    }     

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let {
      user_code,
      username,
      token,
      email,
      account_type,
      name,
      address,
      description,
      started_work_at,
      profile_picture,
      device_tracker,
      updated_by
    } = req.body

    try{
      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if(!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let data = {
        user_code: user_code,
        username: username,
        token: token,
        email: email,
        account_type: account_type,
        name: name,
        address: address,
        description: description,
        started_work_at: started_work_at,
        profile_picture: profile_picture,
        device_tracker: device_tracker,
        updated_by: updated_by,
      }

      if(req.body?.password && req.body?.password != null){
        data.password = await bcrypt.hash(req.body.password, saltRounds)
      }
      
      let qRes = await user.update(data, {
        where: { id: req.params.id }
      })

      //delete old picture
      if(exist.profile_picture != profile_picture){ 
        const file = `./public/${exist.profile_picture}`
        if(fs.existSync(file)){
          fs.unlinkSync(file)
        }
      }

      return res.json({
        "status": true,
        "message": "user:success",
        "data": qRes
      })
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async delete(req, res) {
    try {
      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if(!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      
      let qRes = await user.destroy({
        where: {
          id: req.params.id
        }
      })

      //delete picture
      if(exist.profile_picture != null){ 
        const file = `./public/${profile_picture}`
        if(fs.existSync(file)){
          fs.unlinkSync(file)
        }
      }

      return res.json({
        "status": true,
        "message": "user:deleted success",
        "data": qRes
      })
      
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async softDelete(req, res) {
    let rules = {
      deleted_by: 'required'
    }

    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let { 
      deleted_by
    } = req.body

    try {
      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if(!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let qRes = await user.update({
        deleted: 1,
        deleted_at: new Date(),
        deleted_by: deleted_by,
      }, {
        where: {
          id: req.params.id
        }
      })

      return res.json({
        "status": true,
        "message": "user:deleted success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async restore(req, res) {
    try {
      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if(!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let qRes = await user.update({
        deleted: null,
        deleted_at: null,
        deleted_by: null,
      }, {
        where: {
          id: req.params.id
        }
      })

      return res.json({
        "status": true,
        "message": "user:restored success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }
}

module.exports = UserController