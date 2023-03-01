'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class report extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.user, {
        foreignKey: 'generated_by',
        as: 'generater'
      })
    }
  }
  report.init({
    title: DataTypes.TEXT,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    total_employee: DataTypes.INTEGER,
    generated_by: DataTypes.BIGINT,
    generated_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'report',
    timestamps: false,
    freezeTableName: true,
  });
  return report;
};