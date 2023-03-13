const express = require('express')
const router = express.Router()
const ReportController = require('../../controllers/api/ReportController')
const ctl = new ReportController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/report', AuthMiddleware.check, ctl.list)
router.post('/report/create', AuthMiddleware.check, ctl.create)
router.post('/report/generate/:id', AuthMiddleware.check, ctl.generate)
router.get('/report/download_excel/:id', AuthMiddleware.check, ctl.downloadExcel)

module.exports = router
