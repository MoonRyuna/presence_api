'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class presence extends Model {
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
  presence.init({
    check_in: DataTypes.DATE,
    check_out: DataTypes.DATE,
    position_check_in: DataTypes.TEXT,
    position_check_out: DataTypes.TEXT,
    description: DataTypes.TEXT,
    late: DataTypes.BOOLEAN,
    late_amount: DataTypes.DOUBLE,
    overtime: DataTypes.BOOLEAN,
    overtime_amount: DataTypes.DOUBLE,
    user_id: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'presence',
    timestamps: false
  });
  return presence;
};