import mongoose from 'mongoose';

const VoteDateSchema = new mongoose.Schema({
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
        date: {
            type: Date,
            required: true
        },
        timeSlots: [{
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            },
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
        totalVotes: {
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
        date: Date,
        timeSlot: {
            startTime: String,
            endTime: String
        },
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
VoteDateSchema.index({ status: 1, endTime: -1 });
VoteDateSchema.index({ 'createdBy.userId': 1, createdAt: -1 });

// 업데이트 시 updatedAt 자동 갱신
VoteDateSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.VoteDate || mongoose.model('VoteDate', VoteDateSchema);
