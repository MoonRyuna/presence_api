const { office_config, user, presence, sequelize, overtime } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")

class PresenceController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if (req.query.user_id) qWhere.user_id = req.query.user_id
      if (req.query.start_date && req.query.end_date) qWhere.check_in = { [Op.between]: [req.query.start_date, req.query.end_date] }

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

      qRes = await presence.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
        include: [
          { model: user, as: 'user', attributes: ['id', 'user_code', 'username', 'name'] },
        ]
      })

      let current_page = page
      let total = await presence.count({ where: qWhere })
      let prev_page = (+page > 1) ? (+page - 1) : null
      let next_page = total > (+page * limit) ? (+page + 1) : null

      return res.json({
        "status": true,
        "message": "presence:success",
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

  async findById(req, res) {
    try {
      const qRes = await presence.findByPk(req.params.id, {
        include: [
          { model: user, as: 'user', attributes: ['id', 'user_code', 'username', 'name'] },
        ]
      });

      if (!qRes) {
        return res.status(404).json({
          "status": false,
          "message": "presence:not found",
        });
      }

      return res.json({
        "status": true,
        "message": "presence:success",
        "data": qRes,
      });
    } catch (error) {
      return res.status(500).json({
        "status": false,
        "message": error.message,
      });
    }
  }

  async checkIn(req, res) {
    let rules = {
      user_id: "required",
      check_in: "required",
      position_check_in: "required",
      type: "required"
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, check_in, position_check_in, type } = req.body

    const t = await sequelize.transaction();
    try {
      const rulesType = ['wfh', 'wfo']
      if (!rulesType.includes(type)) {
        return res.json({
          "status": false,
          "message": "user:type (must be: wfh, wfo)"
        })
      }

      //check in harus tgl sekarang tidak boleh lebih atau kurang
      const now = moment().format('YYYY-MM-DD');
      const checkIn = moment(check_in, 'YYYY-MM-DD')
      if (!checkIn.isSame(now)) {
        return res.status(200).json({
          "status": false,
          "message": `tanggal check in harus hari ini (${now})`,
        })
      }

      //check tanggal check in hari ini
      const countCheckIn = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${checkIn.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckIn > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah melakukan presensi masuk (${checkIn.format('YYYY-MM-DD')})`,
        })
      }

      //check user
      let userExist = await user.findByPk(user_id)
      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })


      //check dapat wfh
      if (type == "wfh") {
        if (!userExist.can_wfh) {
          return res.json({
            "status": false,
            "message": "user: tidak bisa wfh"
          })
        }
      }

      //check late
      let late = false;
      let lateAmount = 0;
      let officeConfigExist = await office_config.findAll();
      if (officeConfigExist[0] != undefined) {
        officeConfigExist = officeConfigExist[0]
        let workSchedule = officeConfigExist.work_schedule;
        workSchedule = workSchedule.split(" ");
        let startWorkSchedule = workSchedule[0]

        //check late
        let checkInHour = moment(check_in, 'YYYY-MM-DD HH:mm:ss')
        startWorkSchedule = moment(startWorkSchedule, 'HH:mm')

        console.log("check in hour: ", checkInHour)
        console.log("start work schedule: ", startWorkSchedule)

        if (checkInHour.isAfter(startWorkSchedule)) {
          late = true;
          lateAmount = Math.round(moment.duration(checkInHour.diff(startWorkSchedule)).asMinutes())
          console.log(late, lateAmount)
        }
      } else {
        return res.json({
          "status": false,
          "message": "office_config: not found",
        })
      }

      await presence.create({
        check_in: check_in,
        position_check_in: JSON.stringify(position_check_in),
        late: late,
        late_amount: lateAmount,
        user_id: user_id,
        overtime: false,
        full_time: false,
        remaining_hour: 0,
        type: type
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "presensi masuk berhasil",
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async checkOut(req, res) {
    let rules = {
      user_id: "required",
      check_out: "required",
      position_check_out: "required",
      description: "required",
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, check_out, position_check_out, description } = req.body

    const t = await sequelize.transaction();
    try {
      const checkOut = moment(check_out, 'YYYY-MM-DD')

      //check apakah sudah sudah check in?
      const countCheckIn = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${checkOut.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckIn == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum melakukan presensi masuk (${checkOut.format('YYYY-MM-DD')})`,
        })
      }

      //check tanggal check out hari ini
      const countCheckOut = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_out'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${checkOut.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckOut > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah melakukan presensi keluar (${checkOut.format('YYYY-MM-DD')})`,
        })
      }

      //check user
      let userExist = await user.findByPk(user_id)
      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      //check tanggal check out hari ini
      let gCheckIn = await presence.findAll({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${checkOut.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (!gCheckIn || gCheckIn[0] == undefined) {
        return res.status(200).json({
          "status": false,
          "message": `tidak ditemukan (${checkOut.format('YYYY-MM-DD')})`,
        })
      }

      //check fulltime
      let fulltime = false;
      let remainingHour = 0;
      let officeConfigExist = await office_config.findAll();
      if (officeConfigExist[0] != undefined) {
        officeConfigExist = officeConfigExist[0]
        gCheckIn = gCheckIn[0]
        let workSchedule = officeConfigExist.work_schedule;
        workSchedule = workSchedule.split(" ");

        let startWorkSchedule = workSchedule[0]
        startWorkSchedule = moment(startWorkSchedule, 'HH:mm')
        let endWorkSchedule = workSchedule[2]
        endWorkSchedule = moment(endWorkSchedule, 'HH:mm')
        console.log("configStart", startWorkSchedule)
        console.log("configEnd", endWorkSchedule)

        let dCheckIn = moment(gCheckIn.check_in, 'YYYY-MM-DD HH:mm:ss')
        let dCheckOut = moment(check_out, 'YYYY-MM-DD HH:mm:ss')
        console.log("actualStart", dCheckIn)
        console.log("actualEnd", dCheckOut)

        const diffConfig = moment.duration(endWorkSchedule.diff(startWorkSchedule)).asMinutes()
        const diffActual = moment.duration(dCheckOut.diff(dCheckIn)).asMinutes()
        console.log("diffConfig", diffConfig)
        console.log("diffActual", diffActual)

        if (diffActual <= diffConfig) {
          remainingHour = diffConfig - diffActual;
          remainingHour = Math.round(remainingHour)
        } else {
          remainingHour = 0;
        }

        if (diffActual >= diffConfig) fulltime = true;
      } else {
        return res.json({
          "status": false,
          "message": "office_config: not found",
        })
      }

      await presence.update({
        check_out: check_out,
        position_check_out: JSON.stringify(position_check_out),
        description: description,
        full_time: fulltime,
        remaining_hour: remainingHour
      }, {
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${checkOut.format("YYYY-MM-DD")}%`
          })
        }
      })

      await t.commit();
      return res.json({
        "status": true,
        "message": "presensi keluar berhasil",
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async startOvertime(req, res) {
    let rules = {
      user_id: "required",
      overtime_start_at: "required"
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, overtime_start_at } = req.body

    const t = await sequelize.transaction();
    try {
      const overtimeStartAt = moment(overtime_start_at, 'YYYY-MM-DD')
      // check tidak ada overtime hari ini yang aktif
      const countOvertime = await overtime.count({
        where: {
          overtime_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countOvertime == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum mengajukan lembur (${overtimeStartAt.format('YYYY-MM-DD')})`,
        })
      }

      //check apakah sudah check out?
      const countCheckOut = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_out'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckOut == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum melakukan presensi keluar (${overtimeStartAt.format('YYYY-MM-DD')})`,
        })
      }

      //check apakah sudah check out?
      const countStartOvertime = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countStartOvertime > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah memulai lembur (${overtimeStartAt.format('YYYY-MM-DD')})`,
        })
      }

      await presence.update({
        overtime_start_at: overtime_start_at,
        overtime: true
      }, {
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        }
      })
      //
      await t.commit();
      return res.json({
        "status": true,
        "message": "memulai lembur berhasil",
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async endOvertime(req, res) {
    let rules = {
      user_id: "required",
      overtime_end_at: "required"
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, overtime_end_at } = req.body

    const t = await sequelize.transaction();
    try {
      const overtimeEndAt = moment(overtime_end_at, 'YYYY-MM-DD')

      //check apakah sudah sudah start overtime?
      const countCheckOut = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckOut == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum memulai lembur (${overtimeEndAt.format('YYYY-MM-DD')})`,
        })
      }

      //check apakah sudah check out?
      const countEndOvertime = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_end_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countEndOvertime > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah mengakhiri lembur (${overtimeEndAt.format('YYYY-MM-DD')})`,
        })
      }

      await presence.update({
        overtime_end_at: overtime_end_at,
      }, {
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        }
      })
      //
      await t.commit();
      return res.json({
        "status": true,
        "message": "mengakhiri lembur berhasil",
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async startHolidayOvertime(req, res) {
    let rules = {
      user_id: "required",
      overtime_start_at: "required"
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, overtime_start_at } = req.body

    const t = await sequelize.transaction();
    try {
      const overtimeStartAt = moment(overtime_start_at, 'YYYY-MM-DD')
      // check tidak ada overtime hari ini yang aktif
      const countOvertime = await overtime.count({
        where: {
          overtime_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countOvertime == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum mengajukan lembur (${overtimeStartAt.format('YYYY-MM-DD')})`,
        })
      }

      //check apakah sudah mulai lembur?
      const countStartOvertime = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeStartAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countStartOvertime > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah memulai lembur (${overtimeStartAt.format('YYYY-MM-DD')})`,
        })
      }

      await presence.create({
        user_id: user_id,
        check_in: overtime_start_at,
        overtime_start_at: overtime_start_at,
        overtime: true
      })

      //
      await t.commit();
      return res.json({
        "status": true,
        "message": "memulai lembur berhasil",
      })
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        "status": false,
        "message": error.message,
      })
    }
  }

  async endHolidayOvertime(req, res) {
    let rules = {
      user_id: "required",
      overtime_end_at: "required"
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        "status": false,
        "message": 'form:is not complete',
        "data": validation.errors.all()
      })
    }

    let { user_id, overtime_end_at } = req.body

    const t = await sequelize.transaction();
    try {
      const overtimeEndAt = moment(overtime_end_at, 'YYYY-MM-DD')

      //check apakah sudah sudah start overtime?
      const countCheckOut = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countCheckOut == 0) {
        return res.status(200).json({
          "status": false,
          "message": `belum memulai lembur (${overtimeEndAt.format('YYYY-MM-DD')})`,
        })
      }

      //check apakah sudah check out?
      const countEndOvertime = await presence.count({
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_end_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        },
      });

      if (countEndOvertime > 0) {
        return res.status(200).json({
          "status": false,
          "message": `sudah mengakhiri lembur (${overtimeEndAt.format('YYYY-MM-DD')})`,
        })
      }

      await presence.update({
        check_out: overtime_end_at,
        overtime_end_at: overtime_end_at,
      }, {
        where: {
          user_id: user_id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${overtimeEndAt.format("YYYY-MM-DD")}%`
          })
        }
      })
      //
      await t.commit();
      return res.json({
        "status": true,
        "message": "mengakhiri lembur berhasil",
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

module.exports = PresenceController