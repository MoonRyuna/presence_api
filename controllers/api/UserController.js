const { user, user_annual_leave, presence, absence, office_config, overtime, sequelize, submission } = require("../../models")
const { GenerateUserCode, GetPrefixUserCode } = require('../../utils/GenerateCode')
const Validator = require('validatorjs')
const bcrypt = require('bcrypt')
const fs = require('fs')
const Sequelize = require('sequelize')
const { setAnnualLeave } = require('../../utils/CronCommon')
const Op = Sequelize.Op
const saltRounds = 10
const moment = require("moment")
const { getHoliday } = require("../../utils/CalendarCommon")


class UserController {
  async list(req, res) {
    const t = await sequelize.transaction();
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if (req.query.name) qWhere.name = { [Op.iLike]: `%${req.query.name}%` }
      if (req.query.user_code) qWhere.user_code = { [Op.iLike]: `%${req.query.user_code}%` }
      if (req.query.account_type) qWhere.account_type = { [Op.iLike]: `%${req.query.account_type}%` }
      if (req.query.deleted) qWhere.deleted = req.query.deleted

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
      phone_number: "required",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
      device_tracker: "required",
      created_by: "required",
      can_wfh: "required",
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
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
      phone_number,
      account_type,
      name,
      address,
      description,
      started_work_at,
      profile_picture,
      device_tracker,
      created_by,
      can_wfh
    } = req.body

    const t = await sequelize.transaction();
    try {
      let userExist = await user.findOne({
        where: {
          id: created_by
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let usernameExist = await user.findOne({
        where: {
          username: username
        }
      })

      if (usernameExist) return res.json({
        "status": false,
        "message": "user:username already exist"
      })

      let emailExist = await user.findOne({
        where: {
          email: email
        }
      })

      if (emailExist) return res.json({
        "status": false,
        "message": "user:email already exist"
      })

      let phoneNumberExist = await user.findOne({
        where: {
          phone_number: phone_number
        }
      })

      if (phoneNumberExist) return res.json({
        "status": false,
        "message": "user:phone number already exist"
      })

      const rulesAccountType = ['admin', 'hrd', 'karyawan']
      if (!rulesAccountType.includes(account_type)) {
        return res.json({
          "status": false,
          "message": "user:account type not valid (must be: admin, hrd, karyawan)"
        })
      }

      const lastCode = await user.max('user_code', {
        where: { user_code: { [Op.iLike]: `${GetPrefixUserCode(account_type)}%` } }
      })
      let user_code = await GenerateUserCode(GetPrefixUserCode(account_type), lastCode)

      if (!profile_picture) {
        profile_picture = 'public/images/default.png'
      }

      let qRes = await user.create({
        user_code: user_code,
        username: username,
        password: await bcrypt.hash(password, saltRounds),
        email: email,
        phone_number: phone_number,
        account_type: account_type,
        name: name,
        address: address,
        description: description,
        started_work_at: started_work_at,
        profile_picture: profile_picture,
        device_tracker: device_tracker,
        created_by: created_by,
        deleted: 0,
        can_wfh: can_wfh
      })

      await setAnnualLeave();

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
      phone_number: "required",
      account_type: "required",
      name: "required",
      address: "required",
      description: "required",
      started_work_at: "required",
      device_tracker: "required",
      updated_by: "required",
      can_wfh: "required"
    }

    if (req.body?.password) {
      rules.password = 'alpha_dash|min:6'
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let {
      username,
      email,
      phone_number,
      account_type,
      name,
      address,
      description,
      started_work_at,
      profile_picture,
      device_tracker,
      updated_by,
      can_wfh
    } = req.body

    const t = await sequelize.transaction();
    try {
      let userExist = await user.findOne({
        where: {
          id: updated_by
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      const exist = await user.findOne({
        where: {
          id: req.params.id
        }
      })

      if (!exist) return res.json({
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

      if (usernameExist) return res.json({
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

      if (emailExist) return res.json({
        "status": false,
        "message": "user:email already exist"
      })

      let phoneNumberExist = await user.findOne({
        where: {
          phone_number: phone_number,
          id: {
            [Op.not]: req.params.id
          }
        }
      })

      if (phoneNumberExist) return res.json({
        "status": false,
        "message": "user:phone number already exist"
      })

      const rulesAccountType = ['admin', 'hrd', 'karyawan']
      if (!rulesAccountType.includes(account_type)) {
        return res.json({
          "status": false,
          "message": "user:account type not valid (must be: admin, hrd, karyawan)"
        })
      }

      let updateData = {
        username: username,
        email: email,
        phone_number: phone_number,
        account_type: account_type,
        name: name,
        address: address,
        description: description,
        started_work_at: started_work_at,
        device_tracker: device_tracker,
        updated_by: updated_by,
        can_wfh: can_wfh
      }

      if (req.body?.password) {
        updateData.password = await bcrypt.hash(req.body?.password, saltRounds);
      }

      if (profile_picture != "") {
        updateData.profile_picture = profile_picture
      }

      await user.update(updateData, {
        where: { id: req.params.id }
      })

      //delete old picture
      if (profile_picture != "" &&
        exist.profile_picture != "" &&
        exist.profile_picture != profile_picture &&
        exist.profile_picture != 'public/images/default.png') {
        const file = `${exist.profile_picture}`
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
        }
      }

      const data = await user.findOne({ where: { id: req.params.id } })

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

      if (!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await user.destroy({
        where: {
          id: req.params.id
        }
      })

      //delete picture
      if ((exist.profile_picture != "" || exist.profile_picture) && exist.profile_picture != 'public/images/default.png') {
        const file = `${exist.profile_picture}`
        if (fs.existsSync(file)) {
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
    if (validation.fails()) {
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

      if (!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: deleted_by
        }
      })

      if (!userExist) return res.json({
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

      const data = await user.findOne({ where: { id: req.params.id } })

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

      if (!exist) return res.json({
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

      const data = await user.findOne({ where: { id: req.params.id } })

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
    if (validation.fails()) {
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

      if (!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      const passwordMatch = await bcrypt.compare(old_password, exist?.password);
      if (!passwordMatch) return res.json({
        "status": false,
        "message": "user:old password not match"
      })

      await user.update({
        password: await bcrypt.hash(new_password, saltRounds)
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await user.findOne({ where: { id: req.params.id } })

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

  async resetImei(req, res) {
    let rules = {
      user_id: 'required',
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let {
      user_id,
    } = req.body

    const t = await sequelize.transaction();
    try {
      const exist = await user.findOne({
        where: {
          id: user_id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await user.update({
        imei: null
      }, {
        where: {
          id: user_id
        }
      })

      const data = await user.findOne({ where: { id: user_id } })

      await t.commit();
      return res.json({
        "status": true,
        "message": "imei:telah di reset",
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

  async resetDeviceUID(req, res) {
    let rules = {
      user_id: 'required',
    }

    let validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(422).json({
        status: false,
        message: 'form:is not complete',
        data: validation.errors.all()
      })
    }

    let {
      user_id,
    } = req.body

    const t = await sequelize.transaction();
    try {
      const exist = await user.findOne({
        where: {
          id: user_id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await user.update({
        device_uid: null
      }, {
        where: {
          id: user_id
        }
      })

      const data = await user.findOne({ where: { id: user_id } })

      await t.commit();
      return res.json({
        "status": true,
        "message": "device_uid:telah di reset",
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

  async dashboard1(req, res) {
    const t = await sequelize.transaction();
    try {
      let rules = {
        date: "required",
      }

      let validation = new Validator(req.body, rules)
      if (validation.fails()) {
        return res.status(422).json({
          "status": false,
          "message": 'form:is not complete',
          "data": validation.errors.all()
        })
      }

      let { date } = req.body
      let token = req.headers.authorization
      token = token.split(" ")[1]
      const mDate = moment(date, 'YYYY-MM-DD')

      let userRes = await user.findOne({
        where: {
          token: token
        },
        include: [
          { model: user_annual_leave, as: 'user_annual_leave', attributes: ['year', 'annual_leave'] },
        ]
      })

      //check if user not exist
      if (!userRes) {
        return res.json({
          "status": false,
          "message": "user:not found"
        })
      }

      const presenceRes = await presence.findOne({
        where: {
          user_id: userRes.id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        },
      });

      let checkIn = null;
      let checkOut = null;
      if (presenceRes?.check_in) {
        if (presenceRes?.check_in != '') {
          checkIn = moment(presenceRes.check_in).format('YYYY-MM-DD HH:mm:ss');
        }
      }
      if (presenceRes?.check_out) {
        if (presenceRes?.check_out != '') {
          checkOut = moment(presenceRes.check_out).format('YYYY-MM-DD HH:mm:ss');
        }
      }

      const officeConfigRes = await office_config.findOne({
        where: {
          id: 1
        }
      })

      const absenceRes = await absence.count({
        where: {
          absence_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        },
      });

      const overtimeRes = await overtime.count({
        where: {
          overtime_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        },
      });

      let obj = {
        user: userRes,
        presensi: {
          check_in: checkIn,
          check_out: checkOut
        },
        izin: absenceRes,
        lembur: overtimeRes,
        office_config: officeConfigRes,
      }

      await t.commit();
      return res.json({
        "status": true,
        "message": "success",
        "data": obj
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async todayCheck(req, res) {
    const t = await sequelize.transaction();

    try {
      const rules = {
        date: "required",
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        return res.status(422).json({
          status: false,
          message: "form is not complete",
          data: validation.errors.all(),
        });
      }

      const { date } = req.body;
      let token = req.headers.authorization
      token = token.split(" ")[1]

      let userRes = await user.findOne({
        where: {
          token: token
        },
        include: [
          { model: user_annual_leave, as: 'user_annual_leave', attributes: ['year', 'annual_leave'] },
        ]
      })

      //check if user not exist
      if (!userRes) {
        return res.json({
          "status": false,
          "message": "user:not found"
        })
      }

      const mDate = moment(date, "YYYY-MM-DD");

      console.log('date1', mDate.format('YYYY-MM-DD'));

      // Proses
      const obj = {
        date: mDate.format("YYYY-MM-DD"),
        is_weekend: mDate.isoWeekday() > 5, // Cek apakah sabtu atau minggu
        is_holiday: false, // Nilai awal is_holiday adalah false
        holiday_title: [],
        is_workday: true, // Nilai awal is_workday adalah true
        already_check_in: false,
        already_check_out: false,
        is_absence: false,
        have_overtime: false,
        already_overtime_started: false,
        already_overtime_ended: false,
        count_karyawan_active: 0,
        count_karyawan_inactive: 0,
        submission_pending_absence: 0,
        submission_pending_overtime: 0,
      };

      // Cek apakah tanggal merah
      console.log('date2', mDate.format('YYYY-MM-DD'));
      let startDate = mDate.format('YYYY-MM-DD');
      console.log('startDate', startDate);
      let endDate = moment(startDate);
      endDate = endDate.add('1', 'days').format('YYYY-MM-DD')
      console.log('endDate', endDate);

      console.log('date3', mDate.format('YYYY-MM-DD'));

      const holidays = await getHoliday(startDate, endDate);
      obj.is_holiday = holidays.length > 0;
      if (obj.is_holiday) {
        holidays.forEach((title) => {
          obj.holiday_title.push(title.summary)
        })
      }

      // Jika bukan weekend atau hari libur, cek apakah hari kerja
      if (!obj.is_weekend && !obj.is_holiday) {
        const dayOfWeek = mDate.isoWeekday();
        obj.is_workday = dayOfWeek >= 1 && dayOfWeek <= 5;
      } else {
        obj.is_workday = false; // Tidak bekerja jika weekend atau hari libur
      }


      // Get presence by date
      let qPresence = await presence.findOne({
        where: {
          user_id: userRes.id,
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        }
      })

      console.log("presence", qPresence)
      if (qPresence) {
        if (qPresence?.check_in) {
          obj.already_check_in = true
        }

        if (qPresence?.check_out) {
          obj.already_check_out = true
        }
      }

      // Get absence by date
      const qAbsence = await absence.findOne({
        where: {
          user_id: userRes.id,
          absence_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        }
      })

      if (qAbsence) {
        obj.is_absence = true
      }

      // Get overtime by date
      const qOvertime = await overtime.findOne({
        where: {
          user_id: userRes.id,
          overtime_status: { [Op.in]: ['1'] },
          [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
            [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
          })
        }
      })

      if (qOvertime) {
        obj.have_overtime = true
        if (obj.is_weekend || obj.is_holiday) {
          qPresence = await presence.findOne({
            where: {
              user_id: userRes.id,
              [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
                [Op.iLike]: `%${mDate.format("YYYY-MM-DD")}%`
              })
            }
          })
        }
        if (qPresence?.overtime_start_at) {
          obj.already_overtime_started = true
        }
        if (qPresence?.overtime_end_at) {
          obj.already_overtime_ended = true
        }
      }

      // Get count karyawan
      const countKaryawanActive = await user.count({
        where: {
          deleted: false
        }
      });

      obj.count_karyawan_active = countKaryawanActive;

      const countKaryawanInactive = await user.count({
        where: {
          deleted: true
        }
      });

      obj.count_karyawan_inactive = countKaryawanInactive;

      // count submission
      const cAbsence = await submission.count({
        where: {
          submission_status: "0",
          submission_ref_table: "absence"
        }
      });

      obj.submission_pending_absence = cAbsence;

      const cOvertime = await submission.count({
        where: {
          submission_status: "0",
          submission_ref_table: "overtime"
        }
      });

      obj.submission_pending_overtime = cOvertime;

      await t.commit();

      return res.json({
        status: true,
        message: "success",
        data: obj,
      });
    } catch (error) {
      await t.rollback();
      console.log(error);

      return res.json({
        status: false,
        message: error.message,
      });
    }
  }

  async listMonitorKaryawan(req, res) {
    try {
      let date = req.query?.date ? req.query?.date : moment().format('YYYY-MM-DD');
      console.log("ini date", date);

      // Query untuk menghitung total data
      let countQuery = `
        select COUNT(u.id) as total  from "user" u 
        left join presence p on p.user_id =  u.id and to_char(p.check_in, 'YYYY-MM-DD') = '${date}'
        where u.account_type = 'karyawan'
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
      let dataQuery = `
        select u.id as user_id, u.name, p.check_in, p.check_out  from "user" u 
        left join presence p on p.user_id =  u.id and to_char(p.check_in, 'YYYY-MM-DD') = '${date}'
        where u.account_type = 'karyawan'
        order by p.check_in DESC
        limit :limit
        offset :offset
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
        "message": "user:success",
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
      console.log(error)
      return res.status(500).json({
        "status": false,
        "message": error.message,
      });
    }
  }

  async listJatahCutiTahunan(req, res) {
    try {
      let user_id = req.query?.user_id ? req.query?.user_id : "";
      console.log("ini user_id", user_id);

      if (!user_id) {
        return res.json({
          "status": false,
          "message": "user id tidak boleh kosong",
        });
      }

      // Query untuk menghitung total data
      let countQuery = `
      select count(ual.id) as total from user_annual_leave ual 
      inner join "user" u on u.id = ual.user_id and account_type = 'karyawan'
      where ual.user_id  = '${user_id}'
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
      let dataQuery = `
        select u.id as user_id, u."name", ual.year, ual.annual_leave from user_annual_leave ual 
        inner join "user" u on u.id = ual.user_id and account_type = 'karyawan'
        where ual.user_id  = '${user_id}'
        order by ual.year DESC
        limit :limit
        offset :offset
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
        "message": "user:success",
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
      console.log(error)
      return res.status(500).json({
        "status": false,
        "message": error.message,
      });
    }
  }
}

module.exports = UserController