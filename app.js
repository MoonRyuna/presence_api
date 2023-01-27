require('dotenv').config()

const express = require("express")
const moment = require("moment")
const morgan = require("morgan")
const cors = require('cors')

const swaggerUi = require('swagger-ui-express')
const path = require('path')
const YAML = require('yamljs')
const fs = require('fs')

const AuthRouter = require("./routes/api/AuthRouter")
const OfficeConfigRouter = require("./routes/api/OfficeConfigRouter")
const AbsenceTypeRouter = require("./routes/api/AbsenceTypeRouter")
const UserRouter = require('./routes/api/UserRouter')
const UploadRouter = require('./routes/api/UploadRouter')
const AbsenceRouter = require('./routes/api/AbsenceRouter')

const app = express()
const swaggerDocument = YAML.load('./docs/collection.yaml')

const apiVersion = '/api/v1'

//Setup Log
const originalSend = app.response.send
app.response.send = function sendOverWrite(body) {
    originalSend.call(this, body)
    this.resBody = body
}

morgan.token('res-body', (req, res) => {
    if(res.getHeader('Content-Type') == 'application/json; charset=utf-8'){
        if(typeof res.resBody == 'string'){
            return res.resBody        
        }else{
            return JSON.stringify(res.resBody)      
        }
    }
    return JSON.stringify({
        'message': 'Accessing View'
    })
})

morgan.token('req-body', (req, res) => {
    if(res.getHeader('Content-Type') == 'application/json; charset=utf-8'){
        return JSON.stringify(req.body)        
    }
    return null
})

let log_name = '/logs/access_log_'+moment().format('YYYY_MM_DD')+'.log';
let accessLogStream = fs.createWriteStream(path.join(__dirname, log_name), { flags: 'a' })
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] | @req :req-body => @res :res-body', {
    stream: accessLogStream
}))

app.use(cors())
app.use(express.json())
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use('/public', express.static(path.join(__dirname, 'uploads')))
app.get('/', (req, res) => {
    res.json({
        'message': 'welcome to presence api',
        'docs': '/docs'
    })
})

app.use(apiVersion, AuthRouter)
app.use(apiVersion, OfficeConfigRouter)
app.use(apiVersion, AbsenceTypeRouter)
app.use(apiVersion, UserRouter)
app.use(apiVersion, UploadRouter)
app.use(apiVersion, AbsenceRouter)

app.use((error, req, res, next) => {
  return res.json({
    status: false,
    message: error.message
  })
})

//cron
const schedule = require('node-schedule');
const { office_config, user, user_annual_leave, sequelize } = require("./models")

const job = schedule.scheduleJob('0 0 0 1 1 *', async function(){
  console.log('cron start')
  
  const t = await sequelize.transaction();
  try {
    const officeConfig = await office_config.findByPk(1)
    const annual_leave = officeConfig.amount_of_annual _leave
    
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
})

module.exports = app
