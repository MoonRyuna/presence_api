const { overtime, submission, user, sequelize } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")

class OvertimeController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if (req.query.user_id) qWhere.user_id = req.query.user_id
      if (req.query.start_date && req.query.end_date) qWhere.overtime_at = { [Op.between]: [req.query.start_date, req.query.end_date] }

      let qOrder = []
      if (req.query.order != undefined) {
        let order = req.query.order.split(',')
        if (order.length > 0) {
          order.forEach((o) => {
            let obj = o.split(':')
            if (obj.length > 0) {
              if (obj[1] == 'asc' || obj[1] == 'desc') qOrder.push([obj[0], obj[1]])
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
          { model: user, as: 'user', attributes: ['id', 'user_code', 'username', 'name'] },
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
      const qOvertime = await overtime.findByPk(overtime_id)

      if (!qOvertime) {
        return res.json({
          "status": false,
          "message": "overtime:not found",
        })
      }

      const qSubmission = await submission.findAll({
        where: {
          submission_ref_table: 'overtime',
          submission_ref_id: overtime_id
        },
        include: [
          { model: user, as: 'authorizer', attributes: ['id', 'user_code', 'username', 'name'] },
        ]
      })

      if (!qSubmission) {
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

  async list_submission_admin(req, res) {
    try {
      let qWhere = '';
      if (req.query?.start_date && req.query?.end_date) {
        qWhere = `AND (submission_at BETWEEN '${req.query?.start_date}' AND '${req.query?.end_date}')`;
      }

      console.log("WOW", qWhere)
      // Query untuk menghitung total data
      const countQuery = `
        SELECT COUNT(s.id) as total
        FROM submission s
        LEFT JOIN overtime p ON p.id = s.submission_ref_id AND s.submission_ref_table = 'overtime'
        WHERE s.submission_ref_table = 'overtime'
        ${qWhere}
      `;

      // Eksekusi query untuk menghitung total data
      const countResult = await sequelize.queryInterface.sequelize.query(countQuery, {
        type: sequelize.QueryTypes.SELECT,
      });

      const total = +countResult[0].total;
      let current_page = +req.query.page || 1;
      let limit = +req.query.limit || 10;
      let offset = (current_page - 1) * limit;

      // Query utama untuk mengambil data dengan limit dan offset
      const dataQuery = `
        SELECT s.*, p.desc
        FROM submission s
        LEFT JOIN overtime p ON p.id = s.submission_ref_id AND s.submission_ref_table = 'overtime'
        WHERE s.submission_ref_table = 'overtime'
        ${qWhere}
        ORDER BY s.submission_at DESC
        LIMIT :limit
        OFFSET :offset
      `;

      // Eksekusi query untuk mengambil data dengan limit dan offset
      const qRes = await sequelize.queryInterface.sequelize.query(dataQuery, {
        replacements: {
          limit,
          offset,
        },
        type: sequelize.QueryTypes.SELECT,
      });

      let prev_page = (current_page > 1) ? (current_page - 1) : null;
      let next_page = total > (current_page * limit) ? (current_page + 1) : null;
      console.log("total", total)
      console.log("current", (current_page * limit))

      return res.json({
        "status": true,
        "message": "overtime:success",
        "data": {
          "total": total,
          "current_page": current_page,
          "next_page": next_page,
          "prev_page": prev_page,
          "limit": limit,
          "result": qRes,
        }
      });
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      });
    }
  }

  async findById(req, res) {
    try {
      const qRes = await overtime.findByPk(req.params.id, {
        include: [
          { model: user, as: 'user', attributes: ['id', 'user_code', 'username', 'name'] },
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
      overtime_at: "required",
      desc: "required",
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, overtime_at, desc } = req.body

    let attachment = ''
    if (req.body?.attachment) {
      attachment = req.body?.attachment
    }

    const t = await sequelize.transaction();
    try {
      // check tgl pengajuan >= tgl sekarang
      const now = moment().format('YYYY-MM-DD');
      const overtimeAt = moment(overtime_at, 'YYYY-MM-DD')
      if (!overtimeAt.isSameOrAfter(now)) {
        // console.log(overtimeAt, now)
        return res.status(200).json({
          "status": false,
          "message": 'tanggal pengajuan harus sama atau lebih dari tanggal sekarang',
        })
      }

      // check tidak ada overtime hari ini yang pending/approve
      const countOvertime = await overtime.count({
        where: {
          overtime_status: { [Op.in]: ['0', '1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countOvertime > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah ada pengajuan pada tanggal ${overtimeAt.format('YYYY-MM-DD')} *(pending/approved)`,
        })
      }

      let userExist = await user.findByPk(user_id)
      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let qOvertime = await overtime.create({
        user_id: user_id,
        overtime_at: overtime_at,
        overtime_status: 0, //0 = pending, 1 = approved, 2 = rejected, 3 = canceled, 4 = expired
        desc: desc,
        attachment: attachment,
      })

      await submission.create({
        submission_type: "new", //new, cancel
        submission_at: new Date(),
        submission_status: 0, //0 = pending, 1 = approved, 2 = rejected, 4 = expired
        submission_ref_table: "overtime",
        submission_ref_id: qOvertime.id,
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "overtime:submission success",
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
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { overtime_id } = req.body

    const t = await sequelize.transaction();
    try {
      let qOvertime = await overtime.findByPk(overtime_id)
      if (!qOvertime) return res.json({
        "status": false,
        "message": "overtime:not found"
      })

      // check submission di pengajuan ini tidak ada yang pending
      const countSubmission = await submission.count({
        where: {
          submission_status: '0',
          submission_ref_table: 'overtime',
          submission_ref_id: overtime_id
        }
      })

      if (countSubmission) {
        return res.status(200).json({
          "status": false,
          "message": 'silakan selesaikan pengajuan sebelumnya',
        })
      }

      // check pengajuan status 1
      // console.log(qOvertime)
      if (qOvertime.overtime_status != '1') {
        return res.status(200).json({
          "status": false,
          "message": 'pengajuan yang di cancel harus berstatus 1 *(approved)',
        })
      }

      // check tgl pengajuan > tgl sekarang
      const now = moment().format('YYYY-MM-DD')
      const overtimeAt = moment(qOvertime.overtime_at)
      if (overtimeAt.startOf('day').isBefore(now)) {
        return res.status(200).json({
          "status": false,
          "message": 'cancel tidak dapat dilakukan karena telah melebihi hari ini',
        })
      }

      await submission.create({
        submission_type: "cancel", //new, cancel
        submission_at: new Date(),
        submission_status: 0, //0 = pending, 1 = approved, 2 = rejected
        submission_ref_table: "overtime",
        submission_ref_id: qOvertime.id,
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "overtime:cancel success",
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
    if (validation.fails()) {
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
      if (!qSubmission) return res.json({
        "status": false,
        "message": "submission:not found"
      })

      if (qSubmission.submission_status != 0) return res.json({
        "status": false,
        "message": "submission:already " + (qSubmission.submission_status == 1 ? "approved" : "rejected")
      })

      let qOvertime = await overtime.findByPk(qSubmission.submission_ref_id)
      if (!qOvertime) return res.json({
        "status": false,
        "message": "overtime:not found"
      })

      let qUser = await user.findByPk(authorization_by)
      if (!qUser) return res.json({
        "status": false,
        "message": "user:not found"
      })

      if (qSubmission.submission_type == 'new') {
        // check tgl pengajuan > tgl sekarang

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
            id: qOvertime.id
          }
        })

      } else if (qSubmission.submission_type == 'cancel') {
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
            id: qOvertime.id
          }
        })

        if (qOvertime.cut_annual_leave) {
          const qUserAnnualLeave = await user_annual_leave.findAll({
            where: {
              user_id: qOvertime.user_id,
              year: moment().format('YYYY')
            }
          })

          if (qUserAnnualLeave) {
            let qUA = qUserAnnualLeave[0]

            let nAnnualLeave = qUA.annual_leave + 1;
            await user_annual_leave.update({
              annual_leave: nAnnualLeave
            }, {
              where: {
                user_id: qOvertime.user_id
              }
            })
          }
        }
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
    if (validation.fails()) {
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
      if (!qSubmission) return res.json({
        "status": false,
        "message": "submission:not found"
      })

      if (qSubmission.submission_status != 0) return res.json({
        "status": false,
        "message": "submission:already " + (qSubmission.submission_status == 1 ? "approved" : "rejected")
      })

      let qOvertime = await overtime.findByPk(qSubmission.submission_ref_id)
      if (!qOvertime) return res.json({
        "status": false,
        "message": "overtime:not found"
      })

      let qUser = await user.findByPk(authorization_by)
      if (!qUser) return res.json({
        "status": false,
        "message": "user:not found"
      })

      if (qSubmission.submission_type == 'new') {
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
            id: qOvertime.id
          }
        })
      } else if (qSubmission.submission_type == 'cancel') {
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