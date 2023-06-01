const express = require('express')
const router = express.Router()
const OvertimeController = require('../../controllers/api/OvertimeController')
const ctl = new OvertimeController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/overtime', AuthMiddleware.check, ctl.list)
router.get('/overtime/submission/:id', AuthMiddleware.check, ctl.list_submission)
router.get('/overtime/list/submission', AuthMiddleware.check, ctl.list_submission_admin)
router.get('/overtime/:id', AuthMiddleware.check, ctl.findById)
router.post('/overtime/submission', AuthMiddleware.check, ctl.submission)
router.post('/overtime/cancel', AuthMiddleware.check, ctl.cancel)
router.post('/overtime/approve', AuthMiddleware.check, ctl.approve)
router.post('/overtime/reject', AuthMiddleware.check, ctl.reject)

module.exports = router
