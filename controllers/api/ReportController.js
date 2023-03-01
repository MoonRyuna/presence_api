const { office_config, user, presence, sequelize, overtime, report } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")

class ReportController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}

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

      qRes = await report.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
        include: [
          { model: user, as: 'generater', attributes: [ 'id', 'user_code', 'username', 'name' ] },
        ]
      })

      let current_page = page
      let total = await presence.count({ where: qWhere })
      let prev_page = (+page > 1) ? (+page - 1) : null
      let next_page = total > (+page * limit) ? (+page + 1) : null

      return res.json({
        "status": true,
        "message": "report:success",
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
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }        
  }

  async create(req, res) {
    let rules = {
      title: 'required',
      month_report: 'required',
      year_report: 'required',
      generated_by: 'required',
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
      title,
      month_report,
      year_report,
      generated_by
    } = req.body

    try {
      if(parseInt(month_report) < 1 || parseInt(month_report) > 12){
        return res.json({
          "status": false,
          "message": "month_report:hanya boleh 1-12"
        })
      }

      let officeConfigExist = await office_config.findAll();
      if(!officeConfigExist) return res.json({
        "status": false,
        "message": "office_config:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: generated_by
        }
      })

      if(!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      officeConfigExist = officeConfigExist[0]

      let cut_off_date = officeConfigExist.cut_off_date

      month_report = month_report.padStart(2, '0')

      let pEnd = `${year_report}-${month_report}-${cut_off_date}`
      let end_date = moment(pEnd, 'YYYY-MM-DD').subtract(1, "days").format('YYYY-MM-DD');

      let pStart = `${year_report}-${month_report}`
      pStart = moment(pStart, 'YYYY-MM').subtract(1, "months").format('YYYY-MM')
      
      let start_date = moment(`${pStart}-${cut_off_date}`, 'YYYY-MM-DD').format('YYYY-MM-DD');

      console.log("start date", start_date)
      console.log("end date", end_date)

      const countEmployee = await user.count({
        where: {
          account_type: 'karyawan',
        },
      });

      let qRes = await report.create({
        title: title,
        start_date: start_date,
        end_date: end_date,
        generated_by: generated_by,
        generated_at: new Date(),
        total_employee: countEmployee
      })

      return res.json({
        "status": true,
        "message": "report:created success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async generate(req, res) {

  }

  async downloadPdf(req, res) {
    
  }
}

module.exports = ReportController