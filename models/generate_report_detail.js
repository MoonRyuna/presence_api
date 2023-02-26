'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class report_detail extends Model {
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
  report_detail.init({
    user_id: DataTypes.BIGINT,
    hadir: DataTypes.INTEGER,
    tanpa_keterangan: DataTypes.INTEGER,
    cuti: DataTypes.INTEGER,
    sakit: DataTypes.INTEGER,
    izin_lainnya: DataTypes.INTEGER,
    wfh: DataTypes.INTEGER,
    wfo: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'report_detail',
    timestamps: false,
    freezeTableName: true,
  });
  return report_detail;
};