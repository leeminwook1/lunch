import mongoose from 'mongoose';

const GameScoreSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nickname: {
        type: String,
        required: [true, '닉네임은 필수입니다'],
        trim: true,
        maxlength: [20, '닉네임은 20자를 초과할 수 없습니다']
    },
    score: {
        type: Number,
        required: [true, '점수는 필수입니다'],
        min: 0
    },
    gameType: {
        type: String,
        enum: ['runner', 'avoid'],
        default: 'runner'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


// 점수 순으로 인덱스 생성
GameScoreSchema.index({ score: -1, createdAt: -1 });
GameScoreSchema.index({ user: 1, score: -1 });

export default mongoose.models.GameScore || mongoose.model('GameScore', GameScoreSchema);

