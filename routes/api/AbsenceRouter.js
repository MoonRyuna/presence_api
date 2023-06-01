const express = require('express')
const router = express.Router()
const AbsenceController = require('../../controllers/api/AbsenceController')
const ctl = new AbsenceController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/absence', AuthMiddleware.check, ctl.list)
router.get('/absence/submission/:id', AuthMiddleware.check, ctl.list_submission)
router.get('/absence/list/submission', AuthMiddleware.check, ctl.list_submission_admin)
router.get('/absence/:id', AuthMiddleware.check, ctl.findById)
router.post('/absence/submission', AuthMiddleware.check, ctl.submission)
router.post('/absence/cancel', AuthMiddleware.check, ctl.cancel)
router.post('/absence/approve', AuthMiddleware.check, ctl.approve)
router.post('/absence/reject', AuthMiddleware.check, ctl.reject)

module.exports = router
