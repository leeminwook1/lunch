import mongoose from 'mongoose';

const SelectionSchema = new mongoose.Schema({
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
    restaurantImage: {
        type: String,
        required: true
    },
    selectionType: {
        type: String,
        enum: ['random', 'manual'],
        default: 'random'
    },
    selectedAt: {
        type: Date,
        default: Date.now
    }
});

// 최신 선택 기록 조회를 위한 인덱스
SelectionSchema.index({ selectedAt: -1 });

export default mongoose.models.Selection || mongoose.model('Selection', SelectionSchema);