import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';
import User from '../../../models/User';

const sampleRestaurants = [
    {
        name: '동남집',
        distance: '1분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20180301_249%2F15198980472767PDtq_JPEG%2F43VJBklMZzAxUemO1a-41LQf.jpg',
        description: '전통 한식 전문점',
        createdBy: 'system'
    },
    {
        name: '포동이분식',
        distance: '1분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTAyMTBfNDcg%2FMDAxNzM5MTgxNjg2OTkz._7YKLtNtF_krPe1fcrNlXiv1bQD5VWfFWAwxnRNTfXQg.rPhYjykxD-X9oYtscdmbsp61D1A9bAdlFGiM5vGbj_sg.JPEG%2F740%25A3%25DF20250210%25A3%25DF185827.jpg',
        description: '분식 전문점',
        createdBy: 'system'
    },
    {
        name: '차이나쿡',
        distance: '1분',
        category: '중식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250614_282%2F1749893088027YUx8B_JPEG%2F1000039536.jpg',
        description: '중화요리 전문점',
        createdBy: 'system'
    },
    {
        name: '하노이별',
        distance: '8분',
        category: '베트남식',
        image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNDA5MDhfMTEz%2FMDAxNzI1ODAyNDg2OTk1.9ozUfXqDK_PPXhUp6Z7PLBmCQmiHwbpwXbGgWI92ZEcg.kzT2QpuNXqPSY0CuUxuxiBEDLfimRBk8aRLx7gyLqZsg.JPEG%2FDSC06316.JPG',
        description: '베트남 음식 전문점',
        createdBy: 'system'
    },
    {
        name: '생각공장',
        distance: '5분',
        category: '양식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240423_292%2F1713848595048bKmDz_JPEG%2FKakaoTalk_20240123_110527597.jpg',
        description: '양식 레스토랑',
        createdBy: 'system'
    },
    {
        name: '소림마라',
        distance: '5분',
        category: '중식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240614_46%2F1718344455495nBwSs_JPEG%2FKakaoTalk_20240521_173958455_01.jpg',
        description: '마라탕 전문점',
        createdBy: 'system'
    },
    {
        name: '평이담백 뼈칼국수',
        distance: '15분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250304_112%2F1741084826498GzVCp_JPEG%2F1_%25B4%25EB%25C1%25F6_1.jpg',
        description: '뼈칼국수 전문점',
        createdBy: 'system'
    },
    {
        name: '진성숯불생고기',
        distance: '10분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20241108_145%2F1731070503665hqb3c_JPEG%2FIMG_2142.jpeg',
        description: '숯불구이 전문점',
        createdBy: 'system'
    },
    {
        name: '민똣',
        distance: '12분',
        category: '베트남식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250217_236%2F1739766408004RO1vj_JPEG%2F%25BF%25DC%25B0%25FC_%25C7%25C3%25B7%25B9%25C0%25CC%25BD%25BA.jpeg',
        description: '베트남 쌀국수 전문점',
        createdBy: 'system'
    },
    {
        name: '청다담',
        distance: '3분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190523_105%2F1558594923273xQcSi_JPEG%2F_horfJvgzEbzfkMa4g0yUWNq.jpg',
        description: '한정식 전문점',
        createdBy: 'system'
    },
    {
        name: '대한냉면',
        distance: '10분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNTA3MjNfMTMx%2FMDAxNzUzMjQyNDY5NDc3.P0ZcJnfu8GmGQ48cXLNe_AW36jUhAcqaL7Wu5U-WRlgg.I8qwd5fNceXSGVMwxOjM5V2QXrUG4tzE-Tgl0F8kCJYg.JPEG%2F5D9C70EA-CB11-417D-892F-7CC50D9CA061.jpeg%3Ftype%3Dw1500_60_sharpen',
        description: '냉면 전문점',
        createdBy: 'system'
    },
    {
        name: '아림국수전골',
        distance: '10분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F%2F20170301_13%2F14883424804132iixO_JPEG%2FIMG_20170301_131141_875.jpg',
        description: '국수전골 전문점',
        createdBy: 'system'
    },
    {
        name: '홍복반점',
        distance: '10분',
        category: '중식',
        image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA5MTBfMTkx%2FMDAxNzU3NTEwNzI4NzU5.zcaqwpGHZYvq1cDydRoMDKt0_xz1a97jjn6-Adfgx6sg.Hq3wgbxuct2NY1HjXo1P2-fHu5rVwFD_0xGoEpvmoFMg.JPEG%2F01_%25BF%25DC%25B0%25FC.JPG',
        description: '중화요리 전문점',
        createdBy: 'system'
    },
    {
        name: '도쿄집',
        distance: '12분',
        category: '양식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250605_10%2F1749100473589BukOB_JPEG%2FIMG_4685.jpeg',
        description: '일본식 양식 전문점',
        createdBy: 'system'
    },
    {
        name: '볶다',
        distance: '12분',
        category: '양식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250605_13%2F1749109273780uEP2x_JPEG%2FDSC00294.jpg',
        description: '파스타 전문점',
        createdBy: 'system'
    },
    {
        name: '화육면',
        distance: '15분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20230217_97%2F1676611935893zxW4d_JPEG%2FMTXX_MH20230217_142629981.jpg',
        description: '화육면 전문점',
        createdBy: 'system'
    },
    {
        name: '모미모미',
        distance: '5분',
        category: '일식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20230626_89%2F1687713084963suFMI_JPEG%2FKakaoTalk_20230626_020412830_02.jpg',
        description: '일식 전문점',
        createdBy: 'system'
    },
    {
        name: 'GTS버거',
        distance: '5분',
        category: '양식',
        image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA2MDhfMTg4%2FMDAxNzQ5MzcwMjkyODM0._l2XU1fMsBKS98PK5txOCpt0pknrsVdmF8nNkEqydFEg.AIUs-Nfdmi8MUW_8xo41sg7zPWw-6AUKS03yqLNWbFgg.JPEG%2FIMG_2439.JPG',
        description: '수제버거 전문점',
        createdBy: 'system'
    },
    {
        name: '몬스터비',
        distance: '10분',
        category: '양식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240309_184%2F1709967524151JvWH1_JPEG%2Fmain_01.jpg',
        description: '스테이크 전문점',
        createdBy: 'system'
    },
    {
        name: '모에루',
        distance: '10분',
        category: '일식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240910_159%2F1725964028770gn2MW_JPEG%2FDSC03501_-_%25BA%25B9%25BB%25E7%25BA%25BB.jpg',
        description: '일식 라멘 전문점',
        createdBy: 'system'
    },
    {
        name: '본가왕뼈감자탕',
        distance: '10분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250827_266%2F1756263468757YN24q_JPEG%2F%25C0%25BD%25BD%25C4%25BB%25E7%25C1%25F81.jpg',
        description: '뼈감자탕 전문점',
        createdBy: 'system'
    },
    {
        name: '홈플러스',
        distance: '10분',
        category: '기타',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20200209_36%2F1581237568690QjppS_JPEG%2FknmMEnPh1-V9-Cz1w0rAUXl5.jpg',
        description: '대형마트 푸드코트',
        createdBy: 'system'
    },
    {
        name: '옥된장',
        distance: '10분',
        category: '한식',
        image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250428_168%2F1745834443795sIRqs_JPEG%2FKakaoTalk_20250428_190020438.jpg',
        description: '된장찌개 전문점',
        createdBy: 'system'
    }
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: 'Method Not Allowed'
        });
    }

    await connectDB();

    try {
        const { resetAll = false } = req.body;

        if (resetAll) {
            // 모든 데이터 삭제 (개발용)
            await Promise.all([
                Restaurant.deleteMany({}),
                User.deleteMany({})
            ]);
        }

        // 시스템 사용자 생성
        let systemUser = await User.findOne({ name: 'system' });
        if (!systemUser) {
            systemUser = await User.create({
                name: 'system',
                email: 'system@lunch-picker.com'
            });
        }

        // 샘플 가게 데이터 추가 (중복 체크)
        const createdRestaurants = [];
        
        for (const restaurantData of sampleRestaurants) {
            const existing = await Restaurant.findOne({ 
                name: restaurantData.name,
                isActive: true 
            });
            
            if (!existing) {
                const restaurant = await Restaurant.create(restaurantData);
                createdRestaurants.push(restaurant);
            }
        }

        res.status(200).json({
            success: true,
            message: '샘플 데이터가 초기화되었습니다',
            data: {
                createdRestaurants: createdRestaurants.length,
                totalRestaurants: await Restaurant.countDocuments({ isActive: true }),
                systemUser: systemUser._id
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: '샘플 데이터 초기화에 실패했습니다',
            error: error.message
        });
    }
}