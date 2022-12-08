'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class overtime extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
  overtime.init({
    subimission_at: DataTypes.DATE,
    submission_status: DataTypes.TEXT,
    user_id: DataTypes.BIGINT,
    attachment: DataTypes.TEXT,
    overtime_at: DataTypes.DATE,
    approverdAt: DataTypes.DATE,
    approved_by: DataTypes.BIGINT,
    rejectedAt: DataTypes.DATE,
    rejected_by: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'overtime',
    timestamps: false
  });
  return overtime;
};