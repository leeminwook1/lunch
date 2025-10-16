import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, '투표 제목은 필수입니다'],
        trim: true,
        maxlength: [100, '제목은 100자를 초과할 수 없습니다']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, '설명은 200자를 초과할 수 없습니다']
    },
    createdBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userName: {
            type: String,
            required: true
        }
    },
    candidates: [{
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true
        },
        restaurantName: String,
        restaurantCategory: String,
        restaurantImage: String,
        restaurantDistance: String,
        votes: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            userName: String,
            votedAt: {
                type: Date,
                default: Date.now
            }
        }],
        voteCount: {
            type: Number,
            default: 0
        }
    }],
    status: {
        type: String,
        enum: ['active', 'closed', 'cancelled'],
        default: 'active'
    },
    allowMultipleVotes: {
        type: Boolean,
        default: false
    },
    endTime: {
        type: Date,
        required: true
    },
    totalVoters: {
        type: Number,
        default: 0
    },
    winner: {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant'
        },
        restaurantName: String,
        voteCount: Number
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

// 인덱스 생성
VoteSchema.index({ status: 1, endTime: -1 });
VoteSchema.index({ 'createdBy.userId': 1, createdAt: -1 });

// 업데이트 시 updatedAt 자동 갱신
VoteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
