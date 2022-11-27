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
    }
  }
  absence.init({
    submission_at: DataTypes.DATE,
    submission_status: DataTypes.STRING,
    absence_type_id: DataTypes.BIGINT,
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
  });
  return absence;
};