'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class report_summary extends Model {
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
      this.belongsTo(models.report, {
        foreignKey: 'report_id',
        as: 'report'
      })
    }
  }
  report_summary.init({
    user_id: DataTypes.BIGINT,
    report_id: DataTypes.BIGINT,
    hadir: DataTypes.INTEGER,
    tanpa_keterangan: DataTypes.INTEGER,
    cuti: DataTypes.INTEGER,
    sakit: DataTypes.INTEGER,
    izin_lainnya: DataTypes.INTEGER,
    telat: DataTypes.INTEGER,
    wfh: DataTypes.INTEGER,
    wfo: DataTypes.INTEGER,
    lembur: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'report_summary',
    timestamps: false,
    freezeTableName: true,
  });
  return report_summary;
};