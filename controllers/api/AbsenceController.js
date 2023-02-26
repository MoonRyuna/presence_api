const { absence, submission, user, absence_type, user_annual_leave, sequelize } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")

class AbsenceController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if(req.query.user_id) qWhere.user_id = req.query.user_id
      if(req.query.start_date && req.query.end_date) qWhere.absence_at = { [Op.between]: [req.query.start_date, req.query.end_date] }

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

      qRes = await absence.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
        include: [
          { model: user, as: 'user', attributes: [ 'id', 'user_code', 'username', 'name' ] },
          { model: absence_type, as: 'absence_type', attributes: [ 'id', 'name', 'cut_annual_leave' ] },
        ]
      })

      let current_page = page
      let total = await absence.count({ where: qWhere })
      let prev_page = (+page > 1) ? (+page - 1) : null
      let next_page = total > (+page * limit) ? (+page + 1) : null

      return res.json({
        "status": true,
        "message": "absence:success",
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
      let absence_id = req.params.id;
      const qAbsence = await absence.findByPk(absence_id)

      if(!qAbsence){
        return res.json({
          "status": false,
          "message": "absence:not found",
        })
      }

      const qSubmission = await submission.findAll({
        where: {
          submission_ref_table: 'absence',
          submission_ref_id: absence_id
        }, 
        include: [
          { model: user, as: 'authorizer', attributes: [ 'id', 'user_code', 'username', 'name' ] },
        ]
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
        "data": qSubmission
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
      const qRes = await absence.findByPk(req.params.id, {
        include: [
          { model: user, as: 'user', attributes: [ 'id', 'user_code', 'username', 'name' ] },
          { model: absence_type, as: 'absence_type', attributes: [ 'id', 'name', 'cut_annual_leave' ] },
        ]
      });
  
      if (!qRes) {
        return res.status(404).json({
          "status": false,
          "message": "overtime:not found",
        });
      }
  
      return res.json({
        "status": true,
        "message": "overtime:success",
        "data": qRes,
      });
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      });
    }
  }

  async submission(req, res) {
    let rules = {
      user_id: "required",
      absence_at: "required",
      absence_type_id: "required",
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

    let { user_id, absence_at, absence_type_id, desc } = req.body

    let attachment = ''
    if(req.body?.attachment){
      attachment = req.body?.attachment
    }

    const t = await sequelize.transaction();
    try {
      // check tgl pengajuan >= tgl sekarang
      const now = moment().format('YYYY-MM-DD');
      const absenceAt = moment(absence_at, 'YYYY-MM-DD')
      if(!absenceAt.isSameOrAfter(now)) {
        // console.log(absenceAt, now)
        return res.status(200).json({
          "status": false,
          "message": 'tanggal pengajuan harus sama atau lebih dari tanggal sekarang',
        })
      }

      // check tidak ada absen hari ini yang pending/approve
      const countAbsence = await absence.count({
        where: {
          absence_status: { [Op.in]: ['0', '1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${absenceAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if(countAbsence > 0){
        return res.status(200).json({
          "status": false,
          "message": `sudah ada pengajuan pada tanggal ${absenceAt.format('YYYY-MM-DD')} *(pending/approved)`,
        })
      }
    
      let userExist = await user.findByPk(user_id)
      if(!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let absenceTypeExist = await absence_type.findByPk(absence_type_id)
      if(!absenceTypeExist) return res.json({
        "status": false,
        "message": "absence_type:not found"
      })

      // check jatah cuti tahunan
      const cut_annual_leave = absenceTypeExist?.cut_annual_leave;
      if(cut_annual_leave){
        const qUserAnnualLeave = await user_annual_leave.findAll({
          where: {
            user_id: user_id,
            year: moment().format('YYYY')
          }
        })

        if(qUserAnnualLeave){
          let qUA = qUserAnnualLeave[0]
          if(qUA.annual_leave == 0){
            return res.json({
              "status": false,
              "message": "jatah cuti tahun "+moment().format('YYYY')+" habis",
            })
          }
        }
      }

      let qAbsence = await absence.create({
        user_id: user_id,
        absence_at: absence_at,
        absence_status: 0, //0 = pending, 1 = approved, 2 = rejected, 3 = canceled, 4 = expired
        absence_type_id: absence_type_id,
        cut_annual_leave: cut_annual_leave,
        desc: desc,
        attachment: attachment,
      })  

      await submission.create({
        submission_type: "new", //new, cancel
        submission_at: new Date(),
        submission_status: 0, //0 = pending, 1 = approved, 2 = rejected, 4 = expired
        submission_ref_table: "absence",
        submission_ref_id: qAbsence.id,
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "absence:submission success",
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
      absence_id: "required",
    }     
    
    let validation = new Validator(req.body, rules)
    if(validation.fails()){
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }
    
    let { absence_id } = req.body

    const t = await sequelize.transaction();
    try {
      let qAbsence = await absence.findByPk(absence_id)
      if(!qAbsence) return res.json({
        "status": false,
        "message": "absence:not found"
      })

      // check submission di pengajuan ini tidak ada yang pending
      const countSubmission = await submission.count({
        where: {
          submission_status: '0',
          submission_ref_table: 'absence',
          submission_ref_id: absence_id
        }
      })

      if(countSubmission){
        return res.status(200).json({
          "status": false,
          "message": 'silakan selesaikan pengajuan sebelumnya',
        })
      }

      // check pengajuan status 1
      // console.log(qAbsence)
      if(qAbsence.absence_status != '1'){
        return res.status(200).json({
          "status": false,
          "message": 'pengajuan yang di cancel harus berstatus 1 *(approved)',
        })
      }

      // check tgl pengajuan > tgl sekarang
      const now = moment().format('YYYY-MM-DD')
      const absenceAt = moment(qAbsence.absence_at)
      if(absenceAt.startOf('day').isBefore(now)) {
        return res.status(200).json({
          "status": false,
          "message": 'cancel tidak dapat dilakukan karena telah melebihi hari ini',
        })
      }

      await submission.create({
        submission_type: "cancel", //new, cancel
        submission_at: new Date(),
        submission_status: 0, //0 = pending, 1 = approved, 2 = rejected
        submission_ref_table: "absence",
        submission_ref_id: qAbsence.id,
      })
      
      await t.commit();
      return res.json({
        "status": true,
        "message": "absence:cancel success",
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

      let qAbsence = await absence.findByPk(qSubmission.submission_ref_id)
      if(!qAbsence) return res.json({
        "status": false,
        "message": "absence:not found"
      })

      let qUser = await user.findByPk(authorization_by)
      if(!qUser) return res.json({
        "status": false,
        "message": "user:not found"
      })

      if(qSubmission.submission_type == 'new'){
        // check tgl pengajuan > tgl sekarang
        if(qAbsence.cut_annual_leave){
          const qUserAnnualLeave = await user_annual_leave.findAll({
            where: {
              user_id: qAbsence.user_id,
              year: moment().format('YYYY')
            }
          })

          if(qUserAnnualLeave){
            let qUA = qUserAnnualLeave[0]
            if((qUA.annual_leave - 1) == 0){
              return res.json({
                "status": false,
                "message": "absence:jatah cuti tahun "+moment().format('YYYY')+" habis",
              })
            }

            let nAnnualLeave = qUA.annual_leave - 1;
            await user_annual_leave.update({
              annual_leave: nAnnualLeave
            }, {
              where: {
                user_id: qAbsence.user_id
              }
            })
          }
        }
        
        await submission.update({
          submission_status: "1",
          authorization_by: qUser.id,
          authorization_at: new Date()
        }, {
          where: {
            id: submission_id
          }
        })

        await absence.update({
          absence_status: "1"
        }, {
          where: {
            id: qAbsence.id
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

        await absence.update({
          absence_status: "3"
        }, {
          where: {
            id: qAbsence.id
          }
        })

        if(qAbsence.cut_annual_leave){
          const qUserAnnualLeave = await user_annual_leave.findAll({
            where: {
              user_id: qAbsence.user_id,
              year: moment().format('YYYY')
            }
          })

          if(qUserAnnualLeave){
            let qUA = qUserAnnualLeave[0]

            let nAnnualLeave = qUA.annual_leave + 1;
            await user_annual_leave.update({
              annual_leave: nAnnualLeave
            }, {
              where: {
                user_id: qAbsence.user_id
              }
            })
          }
        }
      }

      await t.commit();
      return res.json({
        "status": true,
        "message": "absence:approve success",
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

      let qAbsence = await absence.findByPk(qSubmission.submission_ref_id)
      if(!qAbsence) return res.json({
        "status": false,
        "message": "absence:not found"
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

        await absence.update({
          absence_status: "2"
        }, {
          where: {
            id: qAbsence.id
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
        "message": "absence:reject success",
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

module.exports = AbsenceController