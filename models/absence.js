'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class absence extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.absence_type, {
        foreignKey: 'absence_type_id',
        as: 'absence_type'
      })
      this.belongsTo(models.user, {
        foreignKey: 'user_id',
        as: 'user'
      })
      this.belongsTo(models.user, {
        foreignKey: 'approved_by',
        as: 'approved_by'
      })
      this.belongsTo(models.user, {
        foreignKey: 'rejected_by',
        as: 'rejected_by'
      })
    }
  }
  absence.init({
    submission_at: DataTypes.DATE,
    submission_status: DataTypes.TEXT,
    absence_type_id: DataTypes.BIGINT,
    cut_annual_leave: DataTypes.BOOLEAN,
    user_id: DataTypes.BIGINT,
    attachment: DataTypes.TEXT,
    absence_at: DataTypes.DATE,
    approvedAt: DataTypes.DATE,
    approved_by: DataTypes.BIGINT,
    rejectedAt: DataTypes.DATE,
    rejected_by: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'absence',
    timestamps: false
  });
  return absence;
};