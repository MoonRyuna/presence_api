const { user, sequelize } = require("../../models")
const { GenerateUserCode, GetPrefixUserCode } = require('../../utils/GenerateCode')
const Validator = require('validatorjs')
const bcrypt = require('bcrypt')
const fs = require('fs')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const saltRounds = 10

class UserController {
  async list(req, res) {
    const t = await sequelize.transaction();
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
        if(order.length > 0){
          order.forEach((o) => {
            let obj = o.split(':')
            if(obj.length > 0) {
              if(obj[1] == 'asc' || obj[1] == 'desc') qOrder.push([obj[0], obj[1]])
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

      let current_page = page
      let total = await user.count({ where: qWhere })
      let prev_page = (+page > 1) ? (+page - 1) : null
      let next_page = total > (+page * limit) ? (+page + 1) : null

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:success",
        "data": {
          "total": +total,
          "current_page": +current_page,
          "next_page": +next_page,
          "prev_page": +prev_page,
          "limit": +limit,
          "result": qRes,
        }
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }        
  }

  async findById(req, res) {
    const t = await sequelize.transaction();
    try {
      let qRes = await user.findOne({
        where: { id: req.params.id }
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:success",
        "data": qRes
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async create(req, res) {
    let rules = {
      username: "required|alpha_dash",
      password: "required|alpha_dash|confirmed",
      email: "required|email",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
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
      username,
      password,
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

    const t = await sequelize.transaction();
    try{
      let userExist = await user.findOne({
        where: {
          id: created_by
        }
      })

      if(!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let usernameExist = await user.findOne({
        where: {
          username: username
        }
      })

      if(usernameExist) return res.json({
        "status": false,
        "message": "user:username already exist"
      })

      let emailExist = await user.findOne({
        where: {
          email: email
        }
      })

      if(emailExist) return res.json({
        "status": false,
        "message": "user:email already exist"
      })
      
      const rulesAccountType = ['admin', 'hrd', 'karyawan']
      if(!rulesAccountType.includes(account_type)){
        return res.json({
          "status": false,
          "message": "user:account type not valid (must be: admin, hrd, karyawan)"
        })
      }

      const lastCode = await user.max('user_code', {
        where: { user_code: { [Op.iLike]: `${GetPrefixUserCode(account_type)}%` } }
      })
      let user_code = await GenerateUserCode(GetPrefixUserCode(account_type), lastCode)
      
      if(!profile_picture){
        profile_picture = 'images/default.png'
      }

      let qRes = await user.create({
        user_code: user_code,
        username: username,
        password: await bcrypt.hash(password, saltRounds),
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

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:created success",
        "data": qRes
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async update(req, res) {
    let rules = {
      username: "required|alpha_dash",
      email: "required|email",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
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
      username,
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
      let userExist = await user.findOne({
        where: {
          id: updated_by
        }
      })

      if(!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if(!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let usernameExist = await user.findOne({
        where: {
          username: username,
          id: {
            [Op.not]: req.params.id 
          }
        }
      })

      if(usernameExist) return res.json({
        "status": false,
        "message": "user:username already exist"
      })

      let emailExist = await user.findOne({
        where: {
          email: email,
          id: {
            [Op.not]: req.params.id 
          }
        }
      })

      if(emailExist) return res.json({
        "status": false,
        "message": "user:email already exist"
      })

      const rulesAccountType = ['admin', 'hrd', 'karyawan']
      if(!rulesAccountType.includes(account_type)){
        return res.json({
          "status": false,
          "message": "user:account type not valid (must be: admin, hrd, karyawan)"
        })
      }

      let updateData = {
        username: username,
        email: email,
        account_type: account_type,
        name: name,
        address: address,
        description: description,
        started_work_at: started_work_at,
        device_tracker: device_tracker,
        updated_by: updated_by,
      }

      if(profile_picture != ""){
        updateData.profile_picture = profile_picture
      }
      
      await user.update(updateData, {
        where: { id: req.params.id }
      })

      //delete old picture
      if(profile_picture != "" && 
        exist.profile_picture != "" && 
        exist.profile_picture != profile_picture && 
        exist.profile_picture != 'images/default.png'){ 
        const file = `public/${exist.profile_picture}`
        if(fs.existsSync(file)){
          fs.unlinkSync(file)
        }
      }

      const data = await user.findOne({where: { id: req.params.id}})
      
      await t.commit();
      return res.json({
        "status": true,
        "message": "user:updated success",
        "data": data
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async delete(req, res) {
    const t = await sequelize.transaction();
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
      
      await user.destroy({
        where: {
          id: req.params.id
        }
      })

      //delete picture
      if((exist.profile_picture != "" || exist.profile_picture) && exist.profile_picture != 'images/default.png'){ 
        const file = `public/${exist.profile_picture}`
        if(fs.existsSync(file)){
          fs.unlinkSync(file)
        }
      }

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:deleted success",
        "data": exist
      })
      
    } catch (error) {
      await t.rollback();
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

    const t = await sequelize.transaction();
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

      let userExist = await user.findOne({
        where: {
          id: deleted_by
        }
      })

      if(!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await user.update({
        deleted: 1,
        deletedAt: new Date(),
        deleted_by: deleted_by,
      }, {
        where: {
          id: req.params.id
        }
      })
      
      const data = await user.findOne({where: { id: req.params.id}})
      
      await t.commit();
      return res.json({
        "status": true,
        "message": "user:deleted success",
        "data": data
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async restore(req, res) {
    const t = await sequelize.transaction();
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

      await user.update({
        deleted: null,
        deleted_at: null,
        deleted_by: null,
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await user.findOne({where: { id: req.params.id}})

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:restored success",
        "data": data
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async changePassword(req, res) { 
    let rules = {
      old_password: 'required',
      new_password: 'required|alpha_dash|confirmed|min:6',
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
      old_password,
      new_password,
    } = req.body

    const t = await sequelize.transaction();
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

      const passwordMatch = await bcrypt.compare(old_password, exist?.password);
      if(!passwordMatch) return res.json({
        "status": false,
        "message": "user:old password not match"
      })

      await user.update({
        password: new_password
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await user.findOne({where: { id: req.params.id}})

      await t.commit();
      return res.json({
        "status": true,
        "message": "user:change password success",
        "data": data
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }
}

module.exports = UserController