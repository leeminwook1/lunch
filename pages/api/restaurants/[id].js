import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import Review from '../../../models/Review';
import Visit from '../../../models/Visit';
import mongoose from 'mongoose';

export default async function handler(req, res) {
    await connectDB();

    const { id } = req.query;

    // ObjectId 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: '유효하지 않은 가게 ID입니다'
        });
    }

    switch (req.method) {
        case 'GET':
            try {
                const restaurant = await Restaurant.findById(id);
                
                if (!restaurant || !restaurant.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '가게를 찾을 수 없습니다'
                    });
                }

                res.status(200).json({
                    success: true,
                    data: restaurant
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '가게 정보를 가져오는데 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'PUT':
            try {
                const { name, distance, category, image, description, websiteUrl } = req.body;

                const restaurant = await Restaurant.findById(id);
                
                if (!restaurant || !restaurant.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '가게를 찾을 수 없습니다'
                    });
                }

                // 가게명 중복 검증 (자기 자신 제외)
                if (name && name.trim() !== restaurant.name) {
                    const existingRestaurant = await Restaurant.findOne({ 
                        name: name.trim(),
                        isActive: true,
                        _id: { $ne: id }
                    });

                    if (existingRestaurant) {
                        return res.status(400).json({
                            success: false,
                            message: '이미 존재하는 가게명입니다'
                        });
                    }
                }

                const updatedRestaurant = await Restaurant.findByIdAndUpdate(
                    id,
                    {
                        ...(name && { name: name.trim() }),
                        ...(distance && { distance: distance.trim() }),
                        ...(category && { category }),
                        ...(image && { image: image.trim() }),
                        ...(description !== undefined && { description: description?.trim() }),
                        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl?.trim() }),
                        updatedAt: new Date()
                    },
                    { new: true, runValidators: true }
                );

                res.status(200).json({
                    success: true,
                    data: updatedRestaurant
                });
            } catch (error) {
                if (error.name === 'ValidationError') {
                    const messages = Object.values(error.errors).map(err => err.message);
                    return res.status(400).json({
                        success: false,
                        message: messages.join(', ')
                    });
                }

                res.status(500).json({
                    success: false,
                    message: '가게 수정에 실패했습니다',
                    error: error.message
                });
            }
            break;

        case 'DELETE':
            try {
                const restaurant = await Restaurant.findById(id);
                
                if (!restaurant || !restaurant.isActive) {
                    return res.status(404).json({
                        success: false,
                        message: '가게를 찾을 수 없습니다'
                    });
                }

                // 실제 삭제 (DB에서 완전히 제거)
                await Restaurant.findByIdAndDelete(id);
                
                // 관련된 리뷰와 방문기록도 삭제
                await Promise.all([
                    Review.deleteMany({ restaurantId: id }),
                    Visit.deleteMany({ restaurantId: id })
                ]);

                res.status(200).json({
                    success: true,
                    message: '가게가 삭제되었습니다'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '가게 삭제에 실패했습니다',
                    error: error.message
                });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
            res.status(405).json({
                success: false,
                message: `Method ${req.method} Not Allowed`
            });
    }
}