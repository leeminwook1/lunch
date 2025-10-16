import dbConnect from '../../../lib/mongodb';
import VoteDate from '../../../models/VoteDate';

export default async function handler(req, res) {
    try {
        await dbConnect();
        const { id } = req.query;

        if (req.method === 'GET') {
            // 투표 상세 조회
            const vote = await VoteDate.findById(id).lean();

            if (!vote) {
                return res.status(404).json({
                    success: false,
                    message: '투표를 찾을 수 없습니다.'
                });
            }

            return res.status(200).json({
                success: true,
                data: vote
            });

        } else if (req.method === 'DELETE') {
            // 투표 삭제
            const { userId } = req.body;

            const vote = await VoteDate.findById(id);

            if (!vote) {
                return res.status(404).json({
                    success: false,
                    message: '투표를 찾을 수 없습니다.'
                });
            }

            // 생성자만 삭제 가능
            if (vote.createdBy.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: '투표를 삭제할 권한이 없습니다.'
                });
            }

            await VoteDate.findByIdAndDelete(id);

            return res.status(200).json({
                success: true,
                message: '투표가 삭제되었습니다.'
            });

        } else {
            return res.status(405).json({
                success: false,
                message: '허용되지 않는 HTTP 메서드입니다.'
            });
        }

    } catch (error) {
        console.error('투표 상세 API 오류:', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
}
