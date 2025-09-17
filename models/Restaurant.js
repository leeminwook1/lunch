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
        enum: ['한식', '중식', '일식', '양식', '분식', '치킨', '카페', '기타']
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
    isActive: {
        type: Boolean,
        default: true
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
RestaurantSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);