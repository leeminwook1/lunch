import mongoose from 'mongoose';

const UserPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    userName: {
        type: String,
        required: true
    },
    excludedRestaurants: [{
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true
        },
        restaurantName: String,
        excludedAt: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            maxlength: 100
        }
    }],
    preferences: {
        excludeRecentVisits: {
            type: Boolean,
            default: false
        },
        recentVisitDays: {
            type: Number,
            default: 7,
            min: 1,
            max: 30
        },
        favoriteCategories: [{
            type: String,
            enum: ['한식', '중식', '일식', '양식', '분식', '치킨', '카페', '베트남식', '기타']
        }]
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 업데이트 시 updatedAt 자동 갱신
UserPreferenceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.UserPreference || mongoose.model('UserPreference', UserPreferenceSchema);