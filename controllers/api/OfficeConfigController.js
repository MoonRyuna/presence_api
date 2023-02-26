const { office_config, user, sequelize } = require("../../models")
const Validator = require('validatorjs')
const fs = require('fs')

class OfficeConfigController {
  async get(req, res) {
    try {
      let officeConfig = await office_config.findOne({
        where: {
          id: 1
        }
      })

      return res.json({
        "status": true,
        "message": "office_config:success",
        "data": officeConfig
      })

    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async update(req, res) {
    let rules = {
        name: 'required',
        theme: 'required',
        latitude: 'required',
        longitude: 'required',
        radius: 'required',
        cut_off_date: 'required',
        amount_of_annual_leave: 'required',
        work_schedule: 'required',
        updated_by: 'required'
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
        name,
        theme,
        logo,
        latitude,
        longitude,
        radius,
        cut_off_date,
        amount_of_annual_leave,
        work_schedule,
        updated_by
    } = req.body

    let id = req.params.id

    const t = await sequelize.transaction();
    try {
      let officeConfig = await office_config.findOne({
        where: {
          id: id,
        }
      })

      if(!officeConfig?.id){
        return res.json({
          "status": false,
          "message": "office_config:not found"
        })
      }

      let oUser = await user.findOne({
        where: {
          id: updated_by,
        }
      })
  
      if(!oUser?.username){
        return res.json({
          "status": false,
          "message": "user:not found"
        })
      }
      
      const data  = {
        name: name,
        theme: theme,
        latitude: latitude,
        longitude: longitude,
        radius: radius,
        cut_off_date: cut_off_date,
        amount_of_annual_leave: amount_of_annual_leave,
        work_schedule: work_schedule,
        updated_by: updated_by,
        updatedAt: new Date()
      }

      if(logo != ""){
        data.logo = logo
      }

      await office_config.update(data, {
        where: { id: id }
      })

      
      //delete old picture
      if(logo != "" && 
        officeConfig.logo != "" && 
        officeConfig.logo != logo && 
        officeConfig.logo != 'images/default-logo.png'){ 
        const file = `public/${officeConfig.logo}`
        if(fs.existsSync(file)){
          fs.unlinkSync(file)
        }
      }

      const ndata = await office_config.findOne({where: { id: req.params.id}})
      
      await t.commit();
      return res.json({
        "status": true,
        "message": "office_config:updated",
        "data": ndata
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

module.exports = OfficeConfigController