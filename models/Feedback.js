import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['feature_request', 'bug_report', 'improvement', 'general'],
        default: 'general'
    },
    title: {
        type: String,
        required: [true, '제목은 필수입니다'],
        trim: true,
        maxlength: [100, '제목은 100자를 초과할 수 없습니다']
    },
    content: {
        type: String,
        required: [true, '내용은 필수입니다'],
        trim: true,
        maxlength: [1000, '내용은 1000자를 초과할 수 없습니다']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'rejected'],
        default: 'pending'
    },
    adminReply: {
        content: String,
        repliedAt: Date,
        repliedBy: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 업데이트 시 updatedAt 자동 갱신
FeedbackSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// 인덱스 생성
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
