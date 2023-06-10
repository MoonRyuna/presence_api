const { office_config, user, presence, sequelize, overtime, absence, absence_type, report, report_detail, report_summary, user_annual_leave } = require("../../models")
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const Validator = require('validatorjs')
const moment = require("moment")
const Excel = require('exceljs');

const { getDateRange, getWeekendDays, getHolidays } = require("../../utils/CalendarCommon")

class ReportController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}

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

      qRes = await report.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
        include: [
          { model: user, as: 'generater', attributes: ['id', 'user_code', 'username', 'name'] },
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
    if (validation.fails()) {
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
      if (parseInt(month_report) < 1 || parseInt(month_report) > 12) {
        return res.json({
          "status": false,
          "message": "month_report:hanya boleh 1-12"
        })
      }

      let officeConfigExist = await office_config.findAll();
      if (!officeConfigExist) return res.json({
        "status": false,
        "message": "office_config:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: generated_by
        }
      })

      if (!userExist) return res.json({
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

      if (!reportExist) return res.json({
        "status": false,
        "message": "report:not found"
      })

      let start_date = reportExist.start_date
      let end_date = reportExist.end_date

      console.log('start_date', start_date)
      console.log('end_date', end_date)

      //get tgl dari range tanggal start - end date
      let listRangeTanggal = getDateRange(start_date, end_date)
      let listSabtuMinggu = getWeekendDays(start_date, end_date)
      let listLiburKalender = await getHolidays(start_date, end_date, listSabtuMinggu, true)
      console.log('listRangeTanggal', listRangeTanggal)
      console.log('listSabtuMinggu', listSabtuMinggu)
      console.log('listLiburKalender', listLiburKalender)

      console.log('Jumlah Sabtu Minggu', listSabtuMinggu.length)
      console.log('Jumlah Libur Kalender', listLiburKalender.length)
      const hari_kerja = listRangeTanggal.length - (listSabtuMinggu.length + listLiburKalender.length);
      console.log('hariKerja', hari_kerja)

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

      if (absenceTypeSakit) {
        idSakit = absenceTypeSakit.map(data => data.id);
      }

      const absenceTypeCuti = await absence_type.findAll({
        where: {
          cut_annual_leave: true
        }
      });

      if (absenceTypeCuti) {
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

      if (absenceTypeLainnya) {
        idLainnya = absenceTypeLainnya.map(data => data.id);
      }

      console.log('idSakit', idSakit)
      console.log('idCuti', idCuti)
      console.log('idLainnya', idLainnya)

      if (listKaryawan) {
        for (let karyawan of listKaryawan) {
          let summary = {
            report_id: id,
            hari_kerja: hari_kerja,
            user_id: karyawan.id,
            hadir: 0,
            tanpa_keterangan: 0,
            cuti: 0,
            sakit: 0,
            izin_lainnya: 0,
            telat: 0,
            wfh: 0,
            wfo: 0,
            lembur: 0,
            fulltime: 0,
          }

          for (let tgl of listRangeTanggal) {
            let detail = {
              report_id: id,
              user_id: karyawan.id,
              date: tgl,
              description: '',
            }
            console.log('nama: ', karyawan.name)
            console.log('tgl: ', tgl)
            const isSabtuMinggu = listSabtuMinggu.some((tglMinggu) => moment(tglMinggu).isSame(tgl, 'day'))
            console.log('isSabtuMinggu: ', isSabtuMinggu)
            const isLiburKalender = listLiburKalender.some((tglLibur) => moment(tglLibur).isSame(tgl, 'day'))
            console.log('isLiburKalender: ', isLiburKalender)

            if (isSabtuMinggu || isLiburKalender) {
              tgl = moment(tgl)
              const rPresence = await presence.findOne({
                where: {
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
              });

              console.log("rPresence", rPresence)
              if (rPresence) {
                console.log('check lembur')
                const getLembur = await overtime.findOne({
                  where: {
                    overtime_status: '1',
                    user_id: karyawan.id,
                    [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
                      [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                    })
                  },
                });
                if (getLembur) {
                  let sL = moment(rPresence.overtime_start_at).format('HH:mm:ss')
                  let eL = moment(rPresence.overtime_end_at).format('HH:mm:ss')
                  detail.description = `lembur dihari libur: ${sL} - ${eL} ${getLembur.desc}`
                  summary.lembur = summary.lembur + 1;
                }
              } else {
                if (isSabtuMinggu) {
                  detail.description = `offday: libur sabtu-minggu`
                } else if (isLiburKalender) {
                  detail.description = `offday: libur tanggal merah`
                }
              }
            } else {
              let isAbsence = false;
              tgl = moment(tgl)

              console.log('check cuti')
              const getCuti = await absence.findOne({
                where: {
                  absence_status: '1',
                  absence_type_id: { [Op.in]: idCuti },
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
                include: [
                  { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
                ]
              });
              console.log("cuti", getCuti)
              if (getCuti) {
                detail.description = `tidak hadir: [${getCuti.absence_type.name}] ${getCuti.desc}`
                summary.cuti = summary.cuti + 1;
              }

              console.log('check sakit')
              const getSakit = await absence.findOne({
                where: {
                  absence_status: '1',
                  absence_type_id: { [Op.in]: idSakit },
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
                include: [
                  { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
                ]
              });
              console.log("sakit", getSakit)
              if (getSakit) {
                detail.description = `tidak hadir: [${getSakit.absence_type.name}] ${getSakit.desc}`
                summary.sakit = summary.sakit + 1;
              }

              console.log('check izin lainnya')
              const getLainnya = await absence.findOne({
                where: {
                  absence_status: '1',
                  absence_type_id: { [Op.in]: idLainnya },
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
                include: [
                  { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
                ]
              });
              console.log("lainnya", getLainnya)
              if (getLainnya) {
                detail.description = `tidak hadir: [${getLainnya.absence_type.name}] ${getLainnya.desc}`
                summary.izin_lainnya = summary.izin_lainnya + 1;
              }

              //
              if (getCuti || getSakit || getLainnya) {
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
              if (rPresence) {
                console.log('check telat')
                if (rPresence.late) summary.telat = summary.telat + 1;

                console.log('check fulltime')
                if (rPresence.full_time) summary.fulltime = summary.fulltime + 1;

                console.log('check wfh')
                if (rPresence.type == 'wfh') summary.wfh = summary.wfh + 1;

                console.log('check wfo')
                if (rPresence.type == 'wfo') summary.wfo = summary.wfo + 1;

                let sCI = moment(rPresence.check_in).format('HH:mm:ss')
                console.log("BRO", rPresence.check_out)
                let eCO = rPresence.check_out != null ? moment(rPresence.check_out).format('HH:mm:ss') : '?'
                detail.description = `hadir: [${rPresence?.type?.toUpperCase()}] ${sCI} - ${eCO} ${(rPresence.late ? 'telat' : 'tidak telat')} dan ${(rPresence.full_time ? 'fulltime' : 'tidak fulltime')}`

                console.log('check lembur')
                if (rPresence.overtime) {
                  const getLembur = await overtime.findOne({
                    where: {
                      overtime_status: '1',
                      user_id: karyawan.id,
                      [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
                        [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                      })
                    },
                  });
                  if (getLembur) {
                    let sL = rPresence.overtime_start_at != null ? moment(rPresence.overtime_start_at).format('HH:mm:ss') : "?"
                    let eL = rPresence.overtime_end_at != null ? moment(rPresence.overtime_end_at).format('HH:mm:ss') : "?"
                    detail.description += `, lembur: ${sL} - ${eL} ${getLembur.desc}`
                    summary.lembur = summary.lembur + 1;
                  }
                }
                summary.hadir = summary.hadir + 1;
              } else {
                if (!isAbsence) {
                  detail.description = `tidak hadir: tanpa keterangan`
                  summary.tanpa_keterangan = summary.tanpa_keterangan + 1;
                }
              }
              console.log('detail', detail)
              // report_detail.push(detail)

              const getReportDetail = await report_detail.findOne({
                where: {
                  user_id: karyawan.id,
                  report_id: id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('date'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
              })

              if (getReportDetail) {
                report_detail.update(detail, {
                  where: {
                    id: getReportDetail.id
                  }
                })
              } else {
                report_detail.create(detail)
              }
            }

            const getReportDetail = await report_detail.findOne({
              where: {
                user_id: karyawan.id,
                report_id: id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('date'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            })

            if (getReportDetail) {
              report_detail.update(detail, {
                where: {
                  id: getReportDetail.id
                }
              })
            } else {
              report_detail.create(detail)
            }
          }
          console.log('summary', summary)
          // report_summary.push(summary)
          const getReportSummary = await report_summary.findOne({
            where: {
              user_id: karyawan.id,
              report_id: id
            },
          })

          if (getReportSummary) {
            report_summary.update(summary, {
              where: {
                id: getReportSummary.id
              }
            })
          } else {
            report_summary.create(summary)
          }
          //
        }
      }

      await t.commit();
      return res.json({
        "status": true,
        "message": "report:generated success",
        // "data": report_summary
      })
    } catch (error) {
      console.log(error)
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async downloadExcel(req, res) {
    let id = req.params.id
    const t = await sequelize.transaction();
    try {
      let reportExist = await report.findOne({
        where: {
          id: id
        }
      })

      if (!reportExist) return res.json({
        "status": false,
        "message": "report:not found"
      })

      let officeConfigExist = await office_config.findAll();
      if (officeConfigExist[0] == undefined) return res.json({
        "status": false,
        "message": "office_config:not found"
      })

      if (!reportExist) return res.json({
        "status": false,
        "message": "report:not found"
      })

      let tahunLaporan = moment(reportExist.start_date).format('YYYY');

      const qReportSummary = await report_summary.findAll({
        where: {
          report_id: id
        },
        order: [
          ['user_id', 'ASC']
        ],
        include: [
          {
            model: user, as: 'user', attributes: ['id', 'user_code', 'username', 'name'],
            include: {
              model: user_annual_leave,
              as: 'user_annual_leave',
              attributes: ['id', 'year', 'annual_leave'],
              where: {
                year: tahunLaporan
              }
            },
          },
        ]
      })

      if (!qReportSummary) return res.json({
        "status": false,
        "message": "report_summary:not found"
      })

      const qReportDetail = await report_detail.findAll({
        where: {
          report_id: id
        },
        order: [
          ['date', 'ASC'],
          ['user_id', 'ASC']
        ],
        include: [
          {
            model: user, as: 'user', attributes: ['id', 'user_code', 'name', 'can_wfh', 'email', 'description', 'started_work_at', 'address'],
            include: {
              model: user_annual_leave,
              as: 'user_annual_leave',
              attributes: ['id', 'year', 'annual_leave'],
              where: {
                year: moment().format('YYYY')
              }
            },
          },
        ]
      })

      if (!qReportDetail) return res.json({
        "status": false,
        "message": "report_detail:not found"
      })

      const groupReportDetail = qReportDetail.reduce((acc, curr) => {
        const existingUser = acc.find(user => user.user.id === curr.user_id);

        if (existingUser) {
          existingUser.detail.push(curr);
        } else {
          acc.push({
            user: curr.user,
            detail: [curr]
          });
        }

        return acc;
      }, []);

      // return res.json(groupReportDetail)

      const fileName = `export-${reportExist?.title.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
      const filePath = `public/reports/${fileName}`

      const grayColor = { argb: 'FFC0C0C0' };

      const autoWidth = (worksheet, minimalWidth = 10) => {
        worksheet.columns.forEach((column) => {
          let maxColumnLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            maxColumnLength = Math.max(
              maxColumnLength,
              minimalWidth,
              cell.value ? cell.value.toString().length : 0
            );
          });
          column.width = maxColumnLength + 2;
        });
      };

      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Rangkuman');

      const header = [
        ['Karyawan', 'Hadir', 'Tanpa Keterangan', 'Cuti', 'Sakit', 'Izin Lainnya', 'Telat', 'WFH', 'WFO', 'Lembur', 'Full Time', 'Tidak Full Time', 'Hari Kerja']
      ];

      worksheet.mergeCells('A1:M1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Rekap Kehadiran ${moment(reportExist.start_date).format('D MMMM YYYY')} - ${moment(reportExist.end_date).format('D MMMM YYYY')}`;
      titleCell.font = { bold: true };
      titleCell.alignment = {
        horizontal: 'center'
      }

      header.forEach(row => {
        worksheet.addRow(row);
      });

      const headerRow = worksheet.getRow(2);
      headerRow.eachCell(function (cell) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: grayColor,
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // ['Karyawan', 'Hadir', 'Tanpa Keterangan', 'Cuti', 'Sakit', 'Izin Lainnya', 'Telat', 'WFH', 'WFO', 'Lembur', 'Full Time', 'Tidak Full Time', 'Hari Kerja']
      // return res.json(qReportSummary)
      let startRowIndex = 3;
      let endRowIndex = startRowIndex;
      if (qReportSummary.length > 0) {
        qReportSummary.forEach(row => {
          worksheet.addRow([
            row?.user.name,
            row?.hadir,
            row?.tanpa_keterangan,
            row?.cuti,
            row?.sakit,
            row?.izin_lainnya,
            row?.telat,
            row?.wfh,
            row?.wfo,
            row?.lembur,
            row?.fulltime,
            (row?.hadir - row?.fulltime),
            row?.hari_kerja
          ])
          endRowIndex++
        })

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber >= startRowIndex && rowNumber <= endRowIndex) {
            row.eachCell((cell, colNumber) => {
              cell.style.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            });
          }
        });
      }

      if (groupReportDetail) {
        groupReportDetail.forEach((row) => {
          console.log(row.user.name)
          let worksheet = workbook.addWorksheet(row.user.name);
          // [ 'id', 'user_code', 'name', 'can_wfh', 'email', 'description', 'started_work_at', 'address', 'user_annual_leave]
          worksheet.addRow(['Kode', ':', row.user.user_code])
          worksheet.addRow(['Nama', ':', row.user.name])
          worksheet.addRow(['Email', ':', row.user.email])
          worksheet.addRow(['Alamat', ':', row.user.address])
          worksheet.addRow(['Deskripsi', ':', row.user.description])
          worksheet.addRow(['Tanggal Bergabung', ':', (moment(row.user.started_work_at).format('D MMMM YYYY'))])
          worksheet.addRow(['Sudah Dapat WFH?', ':', (row.user.can_wfh ? 'Sudah' : 'Belum')])
          worksheet.addRow([`Sisa Cuti Tahunan (${tahunLaporan})`, ':', (row?.user?.user_annual_leave?.annual_leave.toString())])

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber >= 1 && rowNumber <= 8) {
              row.eachCell((cell, colNumber) => {
                cell.style.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                }
              });
            }
          });

          autoWidth(worksheet, 10)

          worksheet.mergeCells('A9:C9');
          const titleHCell = worksheet.getCell('A9');
          titleHCell.value = 'Detil Kehadiran';
          titleHCell.font = { bold: true };
          titleHCell.alignment = {
            horizontal: 'center'
          }

          worksheet.addRow([
            'Tanggal',
            'Deskripsi'
          ])
          worksheet.mergeCells('B10:C10');

          const headerRow = worksheet.getRow(10);
          headerRow.eachCell(function (cell) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: grayColor,
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });

          let sRow = 11;
          let eRow = sRow;
          if (row.detail.length > 0) {
            row.detail.forEach((item) => {
              worksheet.addRow([
                (moment(item.date).format('D MMMM YYYY')),
                item.description
              ])
              worksheet.mergeCells(`B${eRow}:C${eRow}`);
              eRow++
            })

            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber >= sRow && rowNumber <= eRow) {
                row.eachCell((cell, colNumber) => {
                  cell.style.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                  }
                });
              }
            });
            autoWidth(worksheet)
          }
        })
      }

      await workbook.xlsx.writeFile(filePath)

      await t.commit();
      return res.json({
        "status": true,
        "message": "excel_report:success",
        "data": {
          "url": filePath
        }
      })
    } catch (error) {
      console.log(error)
      await t.rollback();
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async rekapKaryawan(req, res) {
    let rules = {
      month: 'required',
      year: 'required',
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
      month,
      year,
      user_id
    } = req.body

    try {
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        return res.json({
          "status": false,
          "message": "month:hanya boleh 1-12"
        })
      }

      let officeConfigExist = await office_config.findAll();
      if (!officeConfigExist) return res.json({
        "status": false,
        "message": "office_config:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: user_id
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      officeConfigExist = officeConfigExist[0]

      let cut_off_date = officeConfigExist.cut_off_date

      month = month.padStart(2, '0')

      let pEnd = `${year}-${month}-${cut_off_date}`
      let end_date = moment(pEnd, 'YYYY-MM-DD').subtract(1, "days").format('YYYY-MM-DD');

      let pStart = `${year}-${month}`
      pStart = moment(pStart, 'YYYY-MM').subtract(1, "months").format('YYYY-MM')

      let start_date = moment(`${pStart}-${cut_off_date}`, 'YYYY-MM-DD').format('YYYY-MM-DD');

      console.log('start_date', start_date)
      console.log('end_date', end_date)

      //get tgl dari range tanggal start - end date
      let listRangeTanggal = getDateRange(start_date, end_date)
      let listSabtuMinggu = getWeekendDays(start_date, end_date)
      let listLiburKalender = await getHolidays(start_date, end_date, listSabtuMinggu, true)
      console.log('listRangeTanggal', listRangeTanggal)
      console.log('listSabtuMinggu', listSabtuMinggu)
      console.log('listLiburKalender', listLiburKalender)

      console.log('Jumlah Sabtu Minggu', listSabtuMinggu.length)
      console.log('Jumlah Libur Kalender', listLiburKalender.length)
      const hari_kerja = listRangeTanggal.length - (listSabtuMinggu.length + listLiburKalender.length);
      console.log('hariKerja', hari_kerja)

      let karyawan = await user.findOne({
        where: {
          account_type: "karyawan",
          deleted: false,
          id: user_id
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

      if (absenceTypeSakit) {
        idSakit = absenceTypeSakit.map(data => data.id);
      }

      const absenceTypeCuti = await absence_type.findAll({
        where: {
          cut_annual_leave: true
        }
      });

      if (absenceTypeCuti) {
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

      if (absenceTypeLainnya) {
        idLainnya = absenceTypeLainnya.map(data => data.id);
      }

      console.log('idSakit', idSakit)
      console.log('idCuti', idCuti)
      console.log('idLainnya', idLainnya)

      if (!karyawan) {
        return res.json({
          "status": true,
          "message": "karyawan tidak ditemukan",
        })
      }
      let summary = {
        hari_kerja: hari_kerja,
        user_id: karyawan.id,
        hadir: 0,
        tanpa_keterangan: 0,
        cuti: 0,
        sakit: 0,
        izin_lainnya: 0,
        telat: 0,
        wfh: 0,
        wfo: 0,
        lembur: 0,
        fulltime: 0,
      }

      for (let tgl of listRangeTanggal) {
        let detail = {
          user_id: karyawan.id,
          date: tgl,
          description: '',
        }
        console.log('nama: ', karyawan.name)
        console.log('tgl: ', tgl)
        const isSabtuMinggu = listSabtuMinggu.some((tglMinggu) => moment(tglMinggu).isSame(tgl, 'day'))
        console.log('isSabtuMinggu: ', isSabtuMinggu)
        const isLiburKalender = listLiburKalender.some((tglLibur) => moment(tglLibur).isSame(tgl, 'day'))
        console.log('isLiburKalender: ', isLiburKalender)

        if (isSabtuMinggu || isLiburKalender) {
          tgl = moment(tgl)
          const rPresence = await presence.findOne({
            where: {
              user_id: karyawan.id,
              [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_start_at'), 'YYYY-MM-DD'), {
                [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
              })
            },
          });

          console.log("rPresence", rPresence)
          if (rPresence) {
            console.log('check lembur')
            const getLembur = await overtime.findOne({
              where: {
                overtime_status: '1',
                user_id: karyawan.id,
                [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
                  [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                })
              },
            });
            if (getLembur) {
              let sL = moment(rPresence.overtime_start_at).format('HH:mm:ss')
              let eL = moment(rPresence.overtime_end_at).format('HH:mm:ss')
              detail.description = `lembur dihari libur: ${sL} - ${eL} ${getLembur.desc}`
              summary.lembur = summary.lembur + 1;
            }
          } else {
            if (isSabtuMinggu) {
              detail.description = `offday: libur sabtu-minggu`
            } else if (isLiburKalender) {
              detail.description = `offday: libur tanggal merah`
            }
          }
        } else {
          let isAbsence = false;
          tgl = moment(tgl)

          console.log('check cuti')
          const getCuti = await absence.findOne({
            where: {
              absence_status: '1',
              absence_type_id: { [Op.in]: idCuti },
              user_id: karyawan.id,
              [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
              })
            },
            include: [
              { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
            ]
          });
          console.log("cuti", getCuti)
          if (getCuti) {
            detail.description = `tidak hadir: [${getCuti.absence_type.name}] ${getCuti.desc}`
            summary.cuti = summary.cuti + 1;
          }

          console.log('check sakit')
          const getSakit = await absence.findOne({
            where: {
              absence_status: '1',
              absence_type_id: { [Op.in]: idSakit },
              user_id: karyawan.id,
              [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
              })
            },
            include: [
              { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
            ]
          });
          console.log("sakit", getSakit)
          if (getSakit) {
            detail.description = `tidak hadir: [${getSakit.absence_type.name}] ${getSakit.desc}`
            summary.sakit = summary.sakit + 1;
          }

          console.log('check izin lainnya')
          const getLainnya = await absence.findOne({
            where: {
              absence_status: '1',
              absence_type_id: { [Op.in]: idLainnya },
              user_id: karyawan.id,
              [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('absence_at'), 'YYYY-MM-DD'), {
                [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
              })
            },
            include: [
              { model: absence_type, as: 'absence_type', attributes: ['id', 'name', 'cut_annual_leave'] },
            ]
          });
          console.log("lainnya", getLainnya)
          if (getLainnya) {
            detail.description = `tidak hadir: [${getLainnya.absence_type.name}] ${getLainnya.desc}`
            summary.izin_lainnya = summary.izin_lainnya + 1;
          }

          //
          if (getCuti || getSakit || getLainnya) {
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
          if (rPresence) {
            console.log('check telat')
            if (rPresence.late) summary.telat = summary.telat + 1;

            console.log('check fulltime')
            if (rPresence.full_time) summary.fulltime = summary.fulltime + 1;

            console.log('check wfh')
            if (rPresence.type == 'wfh') summary.wfh = summary.wfh + 1;

            console.log('check wfo')
            if (rPresence.type == 'wfo') summary.wfo = summary.wfo + 1;

            let sCI = moment(rPresence.check_in).format('HH:mm:ss')
            console.log("BRO", rPresence.check_out)
            let eCO = rPresence.check_out != null ? moment(rPresence.check_out).format('HH:mm:ss') : '?'
            detail.description = `hadir: [${rPresence?.type?.toUpperCase()}] ${sCI} - ${eCO} ${(rPresence.late ? 'telat' : 'tidak telat')} dan ${(rPresence.full_time ? 'fulltime' : 'tidak fulltime')}`

            console.log('check lembur')
            if (rPresence.overtime) {
              const getLembur = await overtime.findOne({
                where: {
                  overtime_status: '1',
                  user_id: karyawan.id,
                  [Op.and]: Sequelize.where(Sequelize.fn('to_char', Sequelize.col('overtime_at'), 'YYYY-MM-DD'), {
                    [Op.iLike]: `%${tgl.format("YYYY-MM-DD")}%`
                  })
                },
              });
              if (getLembur) {
                let sL = rPresence.overtime_start_at != null ? moment(rPresence.overtime_start_at).format('HH:mm:ss') : "?"
                let eL = rPresence.overtime_end_at != null ? moment(rPresence.overtime_end_at).format('HH:mm:ss') : "?"
                detail.description += `, lembur: ${sL} - ${eL}`
                summary.lembur = summary.lembur + 1;
              }
            }
            summary.hadir = summary.hadir + 1;
          } else {
            if (!isAbsence) {
              detail.description = `tidak hadir: tanpa keterangan`
              summary.tanpa_keterangan = summary.tanpa_keterangan + 1;
            }
          }
          console.log('detail', detail)
          // report_detail.push(detail)
        }
      }
      console.log('summary', summary)
      res.render('rekap_karyawan', {
        summary: summary,
        start_date: moment(start_date).format("DD/MM/YYYY"),
        end_date: moment(end_date).format("DD/MM/YYYY")
      })
    } catch (error) {
      console.log(error)
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }
}

module.exports = ReportController