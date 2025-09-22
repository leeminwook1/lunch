import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '가게 이름은 필수입니다'],
        trim: true,
        maxlength: [50, '가게 이름은 50자를 초과할 수 없습니다']
    },
    distance: {
        type: String,
        required: [true, '거리 정보는 필수입니다'],
        trim: true
    },
    category: {
        type: String,
        required: [true, '카테고리는 필수입니다'],
        enum: ['한식', '중식', '일식', '양식', '분식', '치킨', '카페', '베트남식', '기타']
    },
    image: {
        type: String,
        required: [true, '이미지 URL은 필수입니다'],
        trim: true
    },
    description: {
        type: String,
        maxlength: [200, '설명은 200자를 초과할 수 없습니다']
    },
    websiteUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                // URL이 비어있으면 검증 통과 (선택사항)
                if (!v) return true;
                // URL 형식 검증
                const urlRegex = /^https?:\/\/.+/;
                return urlRegex.test(v);
            },
            message: 'URL은 http:// 또는 https://로 시작해야 합니다'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // 평점 관련 필드
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: String,
        required: true
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
RestaurantSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);