'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class absence_type extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  absence_type.init({
    name: DataTypes.TEXT,
    cut_annual_leave: DataTypes.BOOLEAN,
    created_by: DataTypes.BIGINT,
    updated_by: DataTypes.BIGINT,
    deleted: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    deleted_by: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'absence_type'
  });
  return absence_type;
};