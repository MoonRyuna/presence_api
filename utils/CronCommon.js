const { office_config, user, user_annual_leave, sequelize } = require("../models")
const moment = require("moment")

async function setAnnualLeave(){
  const t = await sequelize.transaction();
  try {
    const officeConfig = await office_config.findByPk(1)
    const annual_leave = officeConfig.amount_of_annual_leave
    
    const users = await user.findAll()
    const cYear = moment().format('YYYY')
    users.forEach(async(user) => {
      const userAnualLeaveExist = await user_annual_leave.findOne({
        where: {
          user_id: user.id,
          year: cYear
        }
      })
  
      if(!userAnualLeaveExist){
        user_annual_leave.create({
          user_id: user.id,
          year: cYear,
          annual_leave: annual_leave,
        })
      }
    })
    
    await t.commit()
    console.log('cron success')
  } catch (error) {
    console.log("cron failed")
    console.log(error)
    await t.rollback()
  }
}


module.exports = { setAnnualLeave }
  