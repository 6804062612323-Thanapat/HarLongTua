import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const memberSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: Number, required: true },
  userId: String,
  promptPayId: String,
}, { _id: false });

/** รายการเก็บแบบยืดหยุ่น (Mixed) เพราะ Expense และ Payment มีข้อมูลต่างกัน โดยคลาสในโดเมนเป็นผู้ตรวจความถูกต้อง */
const groupSchema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  version: { type: Number, required: true, default: 0 },
  members: { type: [memberSchema], default: [] },
  transactions: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true, minimize: false });
groupSchema.index({ 'members.userId': 1 });

export const UserModel = mongoose.model('User', userSchema);
export const GroupModel = mongoose.model('Group', groupSchema);
