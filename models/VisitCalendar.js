import mongoose from 'mongoose';

const VisitCalendarSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, '사용자 ID는 필수입니다'],
        index: true
    },
    userName: {
        type: String,
        required: [true, '사용자 이름은 필수입니다']
    },
    restaurantId: {
        type: String,
        required: [true, '가게 ID는 필수입니다']
    },
    restaurantName: {
        type: String,
        required: [true, '가게 이름은 필수입니다']
    },
    restaurantCategory: {
        type: String,
        required: [true, '가게 카테고리는 필수입니다']
    },
    restaurantImage: {
        type: String,
        required: [true, '가게 이미지는 필수입니다']
    },
    visitDate: {
        type: Date,
        required: [true, '방문 날짜는 필수입니다'],
        index: true
    },
    visitType: {
        type: String,
        enum: ['random', 'manual', 'slot_machine', 'worldcup'],
        default: 'manual'
    },
    memo: {
        type: String,
        maxlength: [200, '메모는 200자를 초과할 수 없습니다']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 복합 인덱스 생성 (사용자별, 날짜별 조회 최적화)
VisitCalendarSchema.index({ userId: 1, visitDate: 1 });
VisitCalendarSchema.index({ userId: 1, restaurantId: 1, visitDate: 1 }, { unique: true });

export default mongoose.models.VisitCalendar || mongoose.model('VisitCalendar', VisitCalendarSchema);