const express = require('express')
const router = express.Router()
const PresenceController = require('../../controllers/api/PresenceController')
const ctl = new PresenceController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/presence', AuthMiddleware.check, ctl.list)
router.post('/presence/check_in', AuthMiddleware.check, ctl.checkIn)
router.post('/presence/check_out', AuthMiddleware.check, ctl.checkOut)
router.post('/presence/start_overtime', AuthMiddleware.check, ctl.startOvertime)
router.post('/presence/end_overtime', AuthMiddleware.check, ctl.endOvertime)

module.exports = router
