const { office_config, user, presence, sequelize, overtime, absence, absence_type, report, report_summary } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")

const { getWorkingDays } = require("../../utils/CalendarCommon")

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

    const t = await sequelize.transaction();
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

      await t.commit();
      return res.json({
        "status": true,
        "message": "report:created success",
        "data": qRes
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async generate(req, res) {
    let id = req.params.id
    const t = await sequelize.transaction();
    try {
      let reportExist = await report.findOne({
        where: {
          id: id
        }
      })

      if(!reportExist) return res.json({
        "status": false,
        "message": "report:not found"
      })

      let start_date = reportExist.start_date
      let end_date = reportExist.end_date

      console.log('start_date', start_date)
      console.log('end_date', end_date)

      //get hari kerja dari range waktu start - end date
      let hariKerja = await getWorkingDays(start_date, end_date)
      console.log("hari kerja", hariKerja)

      let listKaryawan = await user.findAll({
        where: {
          account_type: "karyawan",
          deleted: false
        }
      })

      let idSakit = [];
      let idCuti = [];
      let idLainnya = [];

      const absenceTypeSakit = await absence_type.findAll({
        where: {
          name: {
            [Op.iLike]: '%sakit%'
          }
        }
      });

      if(absenceTypeSakit){
        idSakit = absenceTypeSakit.map(data => data.id);
      }

      const absenceTypeCuti = await absence_type.findAll({
        where: {
          cut_annual_leave: true
        }
      });
      
      if(absenceTypeCuti){
        idCuti = absenceTypeCuti.map(data => data.id);
      }

      const absenceTypeLainnya = await absence_type.findAll({
        where: {
          name: {
            [Op.notILike]: '%sakit%'
          },
          cut_annual_leave: false
        }      
      })

      if(absenceTypeLainnya){
        idLainnya = absenceTypeLainnya.map(data => data.id);
      }

      console.log('idSakit', idSakit)
      console.log('idCuti', idCuti)
      console.log('idLainnya', idLainnya)

      let report_summary = []
      if(listKaryawan){
        for(let karyawan of listKaryawan){
          let detail = {
            user_id: karyawan.id,
            hadir: hariKerja.length,
            tanpa_keterangan: 0,
            cuti: 0,
            sakit: 0,
            izin_lainnya: 0,
            telat: 0,
            wfh: 0,
            wfo: 0,
            lembur: 0
          }

          for(let tgl of hariKerja){
            let isAbsence = false;
            console.log('nama: ', karyawan.name)
            console.log('tgl: ', tgl)
            tgl = moment(tgl)
            
            console.log('check cuti')
            const countCuti = await absence.count({
              where: {
                absence_status: '1',
                absence_type_id: { [Op.in]: idCuti },
                user_id: karyawan.id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            });
            console.log("cuti", countCuti)
            if(countCuti) detail.cuti = detail.cuti + 1;
            
            console.log('check sakit')
            const countSakit = await absence.count({
              where: {
                absence_status: '1',
                absence_type_id: { [Op.in]: idSakit },
                user_id: karyawan.id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            });
            console.log("sakit", countSakit)
            if(countSakit) detail.sakit = detail.sakit + 1;

            console.log('check izin lainnya')
            const countLainnya = await absence.count({
              where: {
                absence_status: '1',
                absence_type_id: { [Op.in]: idLainnya },
                user_id: karyawan.id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            });
            console.log("lainnya", countLainnya)
            if(countLainnya) detail.izin_lainnya = detail.izin_lainnya + 1;

            //
            if(countSakit || countCuti || countLainnya) {
              isAbsence = true
            }

            const rPresence = await presence.findOne({
              where: {
                user_id: karyawan.id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('check_in'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            });
            
            console.log("rPresence", rPresence)
            if(rPresence){
              console.log('check telat')
              if(rPresence.late) detail.telat = detail.telat + 1;
  
              console.log('check wfh')
              if(rPresence.type == 'wfh') detail.wfh = detail.wfh + 1; 
              
              console.log('check wfo')
              if(rPresence.type == 'wfh') detail.wfo = detail.wfo + 1; 
  
              console.log('check lembur')
              const countLembur = await overtime.count({
                where: {
                  overtime_status: '1',
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
              });
              if(countLembur) detail.lembur = detail.lembur + 1;
            }else{
              if(!isAbsence){
                detail.tanpa_keterangan = detail.tanpa_keterangan + 1;
              }
              detail.hadir = detail.hadir - 1;
            }
            console.log('detail', detail)
          }

          report_summary.push(detail)
        }
      }

      await t.commit();
      return res.json({
        "status": true,
        "message": "report:generated success",
        "data": report_summary
      })
    } catch (error) {
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      }) 
    }
  }

  async downloadPdf(req, res) {
    
  }
}

module.exports = ReportController