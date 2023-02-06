'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class submission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models, refTable) {
      // define association here
      this.belongsTo(models.user, {
        foreignKey: 'authorization_by',
        as: 'authorizer'
      })
    }
  }
  submission.init({
    submission_type: DataTypes.TEXT,
    submission_at: DataTypes.DATE,
    submission_status: DataTypes.TEXT,
    submission_ref_table: DataTypes.TEXT,
    submission_ref_id: DataTypes.BIGINT,
    authorization_by: DataTypes.BIGINT,
    authorization_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'submission',
    timestamps: false,
    freezeTableName: true,
  });
  return submission;
};