'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class office_config extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.user, {
        foreignKey: 'updated_by',
        as: 'updater'
      })
    }
  }
  office_config.init({
    name: DataTypes.TEXT,
    theme: DataTypes.TEXT,
    logo: DataTypes.TEXT,
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,
    radius: DataTypes.DOUBLE,
    cut_off_date: DataTypes.INTEGER,
    amount_of_annual_leave: DataTypes.INTEGER,
    work_schedule: DataTypes.TEXT,
    updated_by: DataTypes.BIGINT,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'office_config',
    timestamps: false,
    freezeTableName: true,
  });
  return office_config;
};