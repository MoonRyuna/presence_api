const { absence_type, user } = require("../../models")
const Validator = require('validatorjs')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

class AbsenceTypeController {
  async list(req, res) {
    try {
      let qRes = []
      let page = req.query.page || 1
      let limit = req.query.limit || 10
      let offset = (page - 1) * limit

      let qWhere = {}
      if (req.query.name) qWhere.name = { [Op.iLike]: `%${req.query.name}%` }
      if (req.query.deleted) qWhere.deleted = req.query.deleted


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

      qRes = await absence_type.findAll({
        offset: offset,
        limit: limit,
        where: qWhere,
        order: qOrder,
      })

      let current_page = page
      let total = await absence_type.count({ where: qWhere })
      let prev_page = (+page > 1) ? (+page - 1) : null
      let next_page = total > (+page * limit) ? (+page + 1) : null

      return res.json({
        "status": true,
        "message": "absence_type:success",
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
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async all(req, res) {
    try {
      let qRes = await absence_type.findAll()

      return res.json({
        "status": true,
        "message": "absence_type:success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async findById(req, res) {
    try {
      let qRes = await absence_type.findOne({
        where: {
          id: req.params.id
        }
      })

      return res.json({
        "status": true,
        "message": "absence_type:success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async create(req, res) {
    let rules = {
      name: 'required',
      cut_annual_leave: 'required',
      created_by: 'required'
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
      name,
      cut_annual_leave,
      created_by
    } = req.body

    try {
      let userExist = await user.findOne({
        where: {
          id: created_by
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      let qRes = await absence_type.create({
        name: name,
        cut_annual_leave: cut_annual_leave,
        created_by: created_by
      })

      return res.json({
        "status": true,
        "message": "absence_type:created success",
        "data": qRes
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async update(req, res) {
    let rules = {
      name: 'required',
      cut_annual_leave: 'required',
      updated_by: 'required'
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
      name,
      cut_annual_leave,
      updated_by
    } = req.body

    try {
      const exist = await absence_type.findOne({
        where: {
          id: req.params.id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "absence_type:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: updated_by
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await absence_type.update({
        name: name,
        cut_annual_leave: cut_annual_leave,
        updated_by: updated_by
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await absence_type.findOne({ where: { id: req.params.id } })

      return res.json({
        "status": true,
        "message": "absence_type:updated success",
        "data": data
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async delete(req, res) {
    try {
      const exist = await absence_type.findOne({
        where: {
          id: req.params.id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "absence_type:not found"
      })

      await absence_type.destroy({
        where: {
          id: req.params.id
        }
      })

      return res.json({
        "status": true,
        "message": "absence_type:deleted success",
        "data": exist
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async softDelete(req, res) {
    let rules = {
      deleted_by: 'required'
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
      deleted_by
    } = req.body

    try {
      const exist = await absence_type.findOne({
        where: {
          id: req.params.id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "absence_type:not found"
      })

      let userExist = await user.findOne({
        where: {
          id: deleted_by
        }
      })

      if (!userExist) return res.json({
        "status": false,
        "message": "user:not found"
      })

      await absence_type.update({
        deleted: 1,
        deletedAt: new Date(),
        deleted_by: deleted_by,
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await absence_type.findOne({ where: { id: req.params.id } })

      return res.json({
        "status": true,
        "message": "absence_type:deleted success",
        "data": data
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }

  async restore(req, res) {
    try {
      const exist = await absence_type.findOne({
        where: {
          id: req.params.id
        }
      })

      if (!exist) return res.json({
        "status": false,
        "message": "absence_type:not found"
      })

      await absence_type.update({
        deleted: null,
        deletedAt: null,
        deleted_by: null,
      }, {
        where: {
          id: req.params.id
        }
      })

      const data = await absence_type.findOne({ where: { id: req.params.id } })

      return res.json({
        "status": true,
        "message": "absence_type:restored success",
        "data": data
      })
    } catch (error) {
      return res.json({
        "status": false,
        "message": error.message
      })
    }
  }
}

module.exports = AbsenceTypeController