import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '사용자 이름은 필수입니다'],
        trim: true,
        maxlength: [30, '사용자 이름은 30자를 초과할 수 없습니다']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true // 선택적 필드이지만 있다면 유니크
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);