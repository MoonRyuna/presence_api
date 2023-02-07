const { overtime, submission, user, sequelize } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')

class OvertimeController {
    async list(req, res) {
      try {
        let qRes = []
        let page = req.query.page || 1
        let limit = req.query.limit || 10
        let offset = (page - 1) * limit
  
        let qWhere = {}
        if(req.query.user_id) qWhere.user_id = req.query.user_id
        if(req.query.start_date && req.query.end_date) qWhere.overtime_at = { [Op.between]: [req.query.start_date, req.query.end_date] }
  
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
  
        qRes = await overtime.findAll({
          offset: offset,
          limit: limit,
          where: qWhere,
          order: qOrder,
          include: [
            { model: user, as: 'user', attributes: [ 'id', 'user_code', 'username', 'name' ] },
          ]
        })
  
        let current_page = page
        let total = await overtime.count({ where: qWhere })
        let prev_page = (+page > 1) ? (+page - 1) : null
        let next_page = total > (+page * limit) ? (+page + 1) : null
  
        return res.json({
          "status": true,
          "message": "overtime:success",
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
  
    async list_submission(req, res) {
      try {
        let overtime_id = req.params.id;
        const qovertime = await overtime.findByPk(overtime_id)
        if(!qovertime){
          return res.json({
            "status": false,
            "message": "overtime:not found",
          })
        }
  
        const qSubmission = await submission.findAll({
          where: {
            submission_ref_table: 'overtime',
            submission_ref_id: overtime_id
          }
        })
  
        if(!qSubmission) {
          return res.json({
            "status": false,
            "message": "submission:empty",
          })
        }
  
        return res.json({
          "status": true,
          "message": "submission:success",
        })
      } catch (error) {
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }        
    }
  
    async findById(req, res) {
      const t = await sequelize.transaction();
      try {
        let qRes = await overtime.findByPk(req.params.id)
        await t.commit();
        return res.json({
          "status": true,
          "message": "overtime:success",
        })
      } catch (error) {
        await t.rollback();
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }        
    }
  
    async submission(req, res) {
      let rules = {
        user_id: "required",
        overtime_at: "required",
        desc: "required",
      }     
  
      let validation = new Validator(req.body, rules)
      if(validation.fails()){
        return res.status(422).json({
          "status": false,
          "message": 'form:is not complete',
          "data": validation.errors.all()
        })
      }
  
      let { user_id, overtime_at, desc } = req.body
  
      let attachment = ''
      if(req.body?.attachment){
        attachment = req.body?.attachment
      }
  
      const t = await sequelize.transaction();
      try {
        let userExist = await user.findByPk(user_id)
        if(!userExist) return res.json({
          "status": false,
          "message": "user:not found"
        })

        let qovertime = await overtime.create({
          user_id: user_id,
          overtime_at: overtime_at,
          overtime_status: 1, //0 = pending, 1 = approved, 2 = rejected, 3 = canceled
          desc: desc,
          attachment: attachment,
        })  
  
        await submission.create({
          submission_type: "new", //new, cancel
          submission_at: new Date(),
          submission_status: 0, //0 = pending, 1 = approved, 2 = rejected
          submission_ref_table: "overtime",
          submission_ref_id: qovertime.id,
        })
  
        await t.commit();
        return res.json({
          "status": true,
          "message": "overtime:success",
        })
      } catch (error) {
        await t.rollback();
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }        
    }
  
    async cancel(req, res) {
      let rules = {
        overtime_id: "required",
      }     
  
      let validation = new Validator(req.body, rules)
      if(validation.fails()){
        return res.status(422).json({
          "status": false,
          "message": 'form:is not complete',
          "data": validation.errors.all()
        })
      }
  
      let { overtime_id } = req.body
  
      const t = await sequelize.transaction();
      try {
        let qovertime = await overtime.findByPk(overtime_id)
        if(!qovertime) return res.json({
          "status": false,
          "message": "overtime:not found"
        })
  
        await submission.create({
          submission_type: "cancel", //new, cancel
          submission_at: new Date(),
          submission_status: 0, //0 = pending, 1 = approved, 2 = rejected
          submission_ref_table: "overtime",
          submission_ref_id: qovertime.id,
        })
        
        await t.commit();
        return res.json({
          "status": true,
          "message": "overtime:success",
        })
      }
      catch (error) {
        await t.rollback();
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }    
    }
  
    async approve(req, res) {
      let rules = {
        submission_id: "required",
        authorization_by: "required",
      }     
  
      let validation = new Validator(req.body, rules)
      if(validation.fails()){
        return res.status(422).json({
          "status": false,
          "message": 'form:is not complete',
          "data": validation.errors.all()
        })
      }
  
      let { submission_id, authorization_by } = req.body
  
      const t = await sequelize.transaction();
      try {
        let qSubmission = await submission.findByPk(submission_id)
        if(!qSubmission) return res.json({
          "status": false,
          "message": "submission:not found"
        })
  
        if(qSubmission.submission_status != 0) return res.json({
          "status": false,
          "message": "submission:already " + (qSubmission.submission_status == 1 ? "approved" : "rejected")
        })
  
        let qovertime = await overtime.findByPk(qSubmission.submission_ref_id)
        if(!qovertime) return res.json({
          "status": false,
          "message": "overtime:not found"
        })
  
        let qUser = await user.findByPk(authorization_by)
        if(!qUser) return res.json({
          "status": false,
          "message": "user:not found"
        })
  
        if(qSubmission.submission_type == 'new'){          
          await submission.update({
            submission_status: "1",
            authorization_by: qUser.id,
            authorization_at: new Date()
          }, {
            where: {
              id: submission_id
            }
          })
  
          await overtime.update({
            overtime_status: "1"
          }, {
            where: {
              id: qovertime.id
            }
          })
  
        }else if(qSubmission.submission_type == 'cancel'){
          await submission.update({
            submission_status: "1",
            authorization_by: qUser.id,
            authorization_at: new Date()
          }, {
            where: {
              id: submission_id
            }
          })
  
          await overtime.update({
            overtime_status: "3"
          }, {
            where: {
              id: qovertime.id
            }
          })
        }
  
        await t.commit();
        return res.json({
          "status": true,
          "message": "overtime:approve success",
        })
      } catch (error) {
        await t.rollback();
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }        
    }
  
    async reject(req, res) {
      let rules = {
        submission_id: "required",
        authorization_by: "required",
      }     
  
      let validation = new Validator(req.body, rules)
      if(validation.fails()){
        return res.status(422).json({
          "status": false,
          "message": 'form:is not complete',
          "data": validation.errors.all()
        })
      }
  
      let { submission_id, authorization_by } = req.body
  
      const t = await sequelize.transaction();
      try {
        let qSubmission = await submission.findByPk(submission_id)
        if(!qSubmission) return res.json({
          "status": false,
          "message": "submission:not found"
        })
  
        if(qSubmission.submission_status != 0) return res.json({
          "status": false,
          "message": "submission:already " + (qSubmission.submission_status == 1 ? "approved" : "rejected")
        })
  
        let qovertime = await overtime.findByPk(qSubmission.submission_ref_id)
        if(!qovertime) return res.json({
          "status": false,
          "message": "overtime:not found"
        })
  
        let qUser = await user.findByPk(authorization_by)
        if(!qUser) return res.json({
          "status": false,
          "message": "user:not found"
        })
  
        if(qSubmission.submission_type == 'new'){
          await submission.update({
            submission_status: "2",
            authorization_by: qUser.id,
            authorization_at: new Date()
          }, {
            where: {
              id: submission_id
            }
          })
  
          await overtime.update({
            overtime_status: "2"
          }, {
            where: {
              id: qovertime.id
            }
          })
        }else if(qSubmission.submission_type == 'cancel'){
          await submission.update({
            submission_status: "2",
            authorization_by: qUser.id,
            authorization_at: new Date()
          }, {
            where: {
              id: submission_id
            }
          })
        }
  
        await t.commit();
        return res.json({
          "status": true,
          "message": "overtime:reject success",
        })
      } catch (error) {
        await t.rollback();
        return res.status(500).json({
          "status": false,
          "message": error.message,
        })
      }        
    }
  }

  module.exports = OvertimeController