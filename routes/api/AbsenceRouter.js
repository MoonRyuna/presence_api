const express = require('express')
const router = express.Router()
const AbsenceController = require('../../controllers/api/AbsenceController')
const ctl = new AbsenceController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/absence', AuthMiddleware.check, ctl.list)
router.get('/absence/:id', AuthMiddleware.check, ctl.findById)
router.post('/absence/submission', AuthMiddleware.check, ctl.submission)

module.exports = router
