import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
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
    rating: {
        type: Number,
        required: [true, '평점은 필수입니다'],
        min: [1, '평점은 1점 이상이어야 합니다'],
        max: [5, '평점은 5점 이하여야 합니다']
    },
    content: {
        type: String,
        required: [true, '리뷰 내용은 필수입니다'],
        trim: true,
        maxlength: [500, '리뷰는 500자를 초과할 수 없습니다']
    },
    likes: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: String,
        likedAt: {
            type: Date,
            default: Date.now
        }
    }],
    likeCount: {
        type: Number,
        default: 0
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

// 복합 인덱스 생성 (사용자당 가게별 리뷰는 하나만)
ReviewSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });
ReviewSchema.index({ restaurantId: 1, createdAt: -1 });
ReviewSchema.index({ rating: -1 });

// 업데이트 시 updatedAt 자동 갱신
ReviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);