import dbConnect from '../../../lib/mongodb';
import Vote from '../../../models/Vote';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
    await dbConnect();

    if (req.method === 'GET') {
        try {
            const { status, userId } = req.query;
            
            const query = {};
            if (status) {
                query.status = status;
            }
            if (userId) {
                query['createdBy.userId'] = userId;
            }

            const votes = await Vote.find(query)
                .sort({ createdAt: -1 })
                .limit(50);

            // 만료된 투표 자동 종료
            const now = new Date();
            for (const vote of votes) {
                if (vote.status === 'active' && vote.endTime < now) {
                    vote.status = 'closed';
                    
                    // 우승자 결정
                    let maxVotes = 0;
                    let winner = null;
                    
                    for (const candidate of vote.candidates) {
                        if (candidate.voteCount > maxVotes) {
                            maxVotes = candidate.voteCount;
                            winner = {
                                restaurantId: candidate.restaurantId,
                                restaurantName: candidate.restaurantName,
                                voteCount: candidate.voteCount
                            };
                        }
                    }
                    
                    if (winner) {
                        vote.winner = winner;
                    }
                    
                    await vote.save();
                }
            }

            res.status(200).json({
                success: true,
                data: votes
            });
        } catch (error) {
            console.error('투표 목록 조회 실패:', error);
            res.status(500).json({
                success: false,
                message: '투표 목록을 불러오는데 실패했습니다.'
            });
        }
    } else if (req.method === 'POST') {
        try {
            const {
                title,
                description,
                userId,
                userName,
                candidateIds,
                allowMultipleVotes,
                endTime
            } = req.body;

            // 유효성 검사
            if (!title || !userId || !userName || !candidateIds || candidateIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: '필수 정보를 모두 입력해주세요. (최소 2개 이상의 후보 필요)'
                });
            }

            if (!endTime || new Date(endTime) <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: '유효한 마감 시간을 설정해주세요.'
                });
            }

            // 후보 가게 정보 가져오기
            const restaurants = await Restaurant.find({
                _id: { $in: candidateIds }
            });

            if (restaurants.length !== candidateIds.length) {
                return res.status(400).json({
                    success: false,
                    message: '일부 가게 정보를 찾을 수 없습니다.'
                });
            }

            // 후보 데이터 생성
            const candidates = restaurants.map(restaurant => ({
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
                restaurantCategory: restaurant.category,
                restaurantImage: restaurant.image,
                restaurantDistance: restaurant.distance,
                votes: [],
                voteCount: 0
            }));

            // 투표 생성
            const vote = await Vote.create({
                title,
                description,
                createdBy: {
                    userId,
                    userName
                },
                candidates,
                allowMultipleVotes: allowMultipleVotes || false,
                endTime: new Date(endTime),
                status: 'active'
            });

            res.status(201).json({
                success: true,
                data: vote,
                message: '투표가 생성되었습니다!'
            });
        } catch (error) {
            console.error('투표 생성 실패:', error);
            res.status(500).json({
                success: false,
                message: '투표 생성에 실패했습니다.'
            });
        }
    } else {
        res.status(405).json({
            success: false,
            message: '지원하지 않는 메서드입니다.'
        });
    }
}
