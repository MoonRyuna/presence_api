'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user_annual_leave extends Model {
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
    }
  }
  user_annual_leave.init({
    user_id: DataTypes.BIGINT,
    year: DataTypes.TEXT,
    annual_leave: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'user_annual_leave',
    freezeTableName: true,
  });
  return user_annual_leave;
};