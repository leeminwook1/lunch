import mongoose from 'mongoose';

const VisitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    restaurantName: {
        type: String,
        required: true
    },
    visitType: {
        type: String,
        enum: ['random', 'manual'],
        default: 'random'
    },
    visitedAt: {
        type: Date,
        default: Date.now
    }
});

// 복합 인덱스 생성 (사용자별 방문 기록 조회 최적화)
VisitSchema.index({ userId: 1, visitedAt: -1 });
VisitSchema.index({ restaurantId: 1, visitedAt: -1 });

export default mongoose.models.Visit || mongoose.model('Visit', VisitSchema);