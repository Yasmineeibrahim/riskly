import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Student = sequelize.define('Student', {
  StudentID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  Name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  Gender: {
    type: DataTypes.ENUM('Male', 'Female'),
    allowNull: false
  },
  AttendanceRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  StudyHoursPerWeek: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  PreviousGrade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  ExtracurricularActivities: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  ParentalSupport: {
    type: DataTypes.ENUM('Low', 'Medium', 'High'),
    allowNull: false
  },
  FinalGrade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  }
}, {
  tableName: 'students',
  timestamps: false // Disable createdAt and updatedAt
});

export default Student; 