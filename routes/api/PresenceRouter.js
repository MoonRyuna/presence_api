const express = require('express')
const router = express.Router()
const PresenceController = require('../../controllers/api/PresenceController')
const ctl = new PresenceController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/presence', AuthMiddleware.check, ctl.list)
router.get('/presence/:id', AuthMiddleware.check, ctl.findById)
router.post('/presence/check_in', AuthMiddleware.check, ctl.checkIn)
router.post('/presence/check_out', AuthMiddleware.check, ctl.checkOut)
router.post('/presence/start_overtime', AuthMiddleware.check, ctl.startOvertime)
router.post('/presence/end_overtime', AuthMiddleware.check, ctl.endOvertime)
router.post('/presence/start_holiday_overtime', AuthMiddleware.check, ctl.startHolidayOvertime)
router.post('/presence/end_holiday_overtime', AuthMiddleware.check, ctl.endHolidayOvertime)

module.exports = router
