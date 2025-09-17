import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
    const [restaurants, setRestaurants] = useState([]);
    const [newRestaurant, setNewRestaurant] = useState('');
    const [newWalkTime, setNewWalkTime] = useState('');
    const [newImage, setNewImage] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [currentView, setCurrentView] = useState('main'); // 'main', 'list', 'detail', 'add', 'manage', 'history'
    const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);
    const [sortBy, setSortBy] = useState('name'); // 'name', 'walkTime'
    const [filterCategory, setFilterCategory] = useState('all'); // 'all', '한식', '중식', '일식', etc.
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [visitHistory, setVisitHistory] = useState([]);
    const [userName, setUserName] = useState('');
    const [isUserNameSet, setIsUserNameSet] = useState(false);
    const [lastSelection, setLastSelection] = useState(null); // 마지막 선택 정보
    const [recentSelections, setRecentSelections] = useState([]); // 최근 선택들

    // 샘플 데이터 정의
    const getSampleData = () => [
        {
            id: 1,
            name: '동남집',
            walkTime: '1분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20180301_249%2F15198980472767PDtq_JPEG%2F43VJBklMZzAxUemO1a-41LQf.jpg'
        },
        {
            id: 2,
            name: '포동이분식',
            walkTime: '1분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTAyMTBfNDcg%2FMDAxNzM5MTgxNjg2OTkz._7YKLtNtF_krPe1fcrNlXiv1bQD5VWfFWAwxnRNTfXQg.rPhYjykxD-X9oYtscdmbsp61D1A9bAdlFGiM5vGbj_sg.JPEG%2F740%25A3%25DF20250210%25A3%25DF185827.jpg'
        },
        {
            id: 3,
            name: '차이나쿡',
            walkTime: '1분',
            category: '중식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250614_282%2F1749893088027YUx8B_JPEG%2F1000039536.jpg'
        },
        {
            id: 4,
            name: '하노이별',
            walkTime: '8분',
            category: '베트남식',
            image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNDA5MDhfMTEz%2FMDAxNzI1ODAyNDg2OTk1.9ozUfXqDK_PPXhUp6Z7PLBmCQmiHwbpwXbGgWI92ZEcg.kzT2QpuNXqPSY0CuUxuxiBEDLfimRBk8aRLx7gyLqZsg.JPEG%2FDSC06316.JPG'
        },
        {
            id: 5,
            name: '생각공장',
            walkTime: '5분',
            category: '양식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240423_292%2F1713848595048bKmDz_JPEG%2FKakaoTalk_20240123_110527597.jpg'
        },
        {
            id: 6,
            name: '소림마라',
            walkTime: '5분',
            category: '중식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240614_46%2F1718344455495nBwSs_JPEG%2FKakaoTalk_20240521_173958455_01.jpg'
        },
        {
            id: 7,
            name: '평이담백 뼈칼국수',
            walkTime: '15분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250304_112%2F1741084826498GzVCp_JPEG%2F1_%25B4%25EB%25C1%25F6_1.jpg'
        },
        {
            id: 8,
            name: '진성숯불생고기',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20241108_145%2F1731070503665hqb3c_JPEG%2FIMG_2142.jpeg'
        },
        {
            id: 9,
            name: '민똣',
            walkTime: '12분',
            category: '베트남식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250217_236%2F1739766408004RO1vj_JPEG%2F%25BF%25DC%25B0%25FC_%25C7%25C3%25B7%25B9%25C0%25CC%25BD%25BA.jpeg'
        },
        {
            id: 10,
            name: '청다담',
            walkTime: '3분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190523_105%2F1558594923273xQcSi_JPEG%2F_horfJvgzEbzfkMa4g0yUWNq.jpg'
        },
        {
            id: 11,
            name: '대한냉면',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fpup-review-phinf.pstatic.net%2FMjAyNTA3MjNfMTMx%2FMDAxNzUzMjQyNDY5NDc3.P0ZcJnfu8GmGQ48cXLNe_AW36jUhAcqaL7Wu5U-WRlgg.I8qwd5fNceXSGVMwxOjM5V2QXrUG4tzE-Tgl0F8kCJYg.JPEG%2F5D9C70EA-CB11-417D-892F-7CC50D9CA061.jpeg%3Ftype%3Dw1500_60_sharpen'
        },
        {
            id: 12,
            name: '아림국수전골',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F%2F20170301_13%2F14883424804132iixO_JPEG%2FIMG_20170301_131141_875.jpg'
        },
        {
            id: 13,
            name: '홍복반점',
            walkTime: '10분',
            category: '중식',
            image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA5MTBfMTkx%2FMDAxNzU3NTEwNzI4NzU5.zcaqwpGHZYvq1cDydRoMDKt0_xz1a97jjn6-Adfgx6sg.Hq3wgbxuct2NY1HjXo1P2-fHu5rVwFD_0xGoEpvmoFMg.JPEG%2F01_%25BF%25DC%25B0%25FC.JPG'
        },
        {
            id: 14,
            name: '도쿄집',
            walkTime: '12분',
            category: '양식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250605_10%2F1749100473589BukOB_JPEG%2FIMG_4685.jpeg'
        },
        {
            id: 15,
            name: '볶다',
            walkTime: '12분',
            category: '양식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250605_13%2F1749109273780uEP2x_JPEG%2FDSC00294.jpg'
        },
        {
            id: 16,
            name: '화육면',
            walkTime: '15분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20230217_97%2F1676611935893zxW4d_JPEG%2FMTXX_MH20230217_142629981.jpg'
        },
        {
            id: 17,
            name: '모미모미',
            walkTime: '5분',
            category: '일식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20230626_89%2F1687713084963suFMI_JPEG%2FKakaoTalk_20230626_020412830_02.jpg'
        },
        {
            id: 18,
            name: 'GTS버거',
            walkTime: '5분',
            category: '양식',
            image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA2MDhfMTg4%2FMDAxNzQ5MzcwMjkyODM0._l2XU1fMsBKS98PK5txOCpt0pknrsVdmF8nNkEqydFEg.AIUs-Nfdmi8MUW_8xo41sg7zPWw-6AUKS03yqLNWbFgg.JPEG%2FIMG_2439.JPG'
        },
        {
            id: 19,
            name: '몬스터비',
            walkTime: '10분',
            category: '양식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240309_184%2F1709967524151JvWH1_JPEG%2Fmain_01.jpg'
        },
        {
            id: 20,
            name: '모에루',
            walkTime: '10분',
            category: '일식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20240910_159%2F1725964028770gn2MW_JPEG%2FDSC03501_-_%25BA%25B9%25BB%25E7%25BA%25BB.jpg'
        },
        {
            id: 21,
            name: '본가왕뼈감자탕 ',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250827_266%2F1756263468757YN24q_JPEG%2F%25C0%25BD%25BD%25C4%25BB%25E7%25C1%25F81.jpg'
        },
        {
            id: 22,
            name: '홈플러스',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20200209_36%2F1581237568690QjppS_JPEG%2FknmMEnPh1-V9-Cz1w0rAUXl5.jpg'
        },
        {
            id: 23,
            name: '옥된장',
            walkTime: '10분',
            category: '한식',
            image: 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20250428_168%2F1745834443795sIRqs_JPEG%2FKakaoTalk_20250428_190020438.jpg'
        }
    ];

    // 로컬 스토리지에서 데이터 불러오기 (클라이언트 사이드에서만)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRestaurants = localStorage.getItem('lunchRestaurants');
            if (savedRestaurants && savedRestaurants !== '[]') {
                try {
                    const parsed = JSON.parse(savedRestaurants);
                    if (parsed.length > 0) {
                        // 기존 데이터에 카테고리가 없으면 샘플 데이터로 교체
                        if (!parsed[0].category) {
                            const sampleData = getSampleData();
                            setRestaurants(sampleData);
                            localStorage.setItem('lunchRestaurants', JSON.stringify(sampleData));
                            return;
                        }
                        setRestaurants(parsed);
                        return;
                    }
                } catch (error) {
                    console.error('로컬스토리지 데이터 파싱 오류:', error);
                }
            }
            // 저장된 데이터가 없거나 빈 배열이면 샘플 데이터 로드
            setRestaurants(getSampleData());
        }
    }, []);

    // 사용자 이름 불러오기
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUserName = localStorage.getItem('lunchUserName');
            if (savedUserName) {
                setUserName(savedUserName);
                setIsUserNameSet(true);
            }
        }
    }, []);

    // 개인 방문기록 불러오기
    useEffect(() => {
        if (typeof window !== 'undefined' && userName) {
            const savedHistory = localStorage.getItem(`lunchVisitHistory_${userName}`);
            if (savedHistory) {
                try {
                    setVisitHistory(JSON.parse(savedHistory));
                } catch (error) {
                    console.error('방문기록 파싱 오류:', error);
                }
            }
        }
    }, [userName]);

    // 공유 최근 선택 불러오기
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRecentSelections = localStorage.getItem('lunchRecentSelections');
            if (savedRecentSelections) {
                try {
                    setRecentSelections(JSON.parse(savedRecentSelections));
                } catch (error) {
                    console.error('최근 선택 파싱 오류:', error);
                }
            }

            const savedLastSelection = localStorage.getItem('lunchLastSelection');
            if (savedLastSelection) {
                try {
                    setLastSelection(JSON.parse(savedLastSelection));
                } catch (error) {
                    console.error('마지막 선택 파싱 오류:', error);
                }
            }
        }
    }, []);

    // 개인 방문기록 저장
    useEffect(() => {
        if (typeof window !== 'undefined' && userName && visitHistory.length > 0) {
            localStorage.setItem(`lunchVisitHistory_${userName}`, JSON.stringify(visitHistory));
        }
    }, [visitHistory, userName]);

    // 필터나 정렬, 검색이 변경되면 첫 페이지로 이동
    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, sortBy, searchQuery]);

    // 로컬 스토리지에 데이터 저장 (빈 배열이 아닐 때만)
    useEffect(() => {
        if (typeof window !== 'undefined' && restaurants.length > 0) {
            localStorage.setItem('lunchRestaurants', JSON.stringify(restaurants));
        }
    }, [restaurants]);

    const addRestaurant = () => {
        if (newRestaurant.trim()) {
            const restaurant = {
                id: Date.now(),
                name: newRestaurant.trim(),
                walkTime: newWalkTime.trim() || '알 수 없음',
                category: newCategory.trim() || '기타',
                image: newImage.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'
            };
            setRestaurants([...restaurants, restaurant]);
            setNewRestaurant('');
            setNewWalkTime('');
            setNewCategory('');
            setNewImage('');
        }
    };

    const deleteRestaurant = (restaurantId) => {
        setRestaurants(restaurants.filter(restaurant => restaurant.id !== restaurantId));
    };

    const pickRandomLunch = () => {
        const availableRestaurants = getFilteredAndSortedRestaurants();

        if (availableRestaurants.length === 0) {
            showModal('error', '선택 불가', '선택할 수 있는 가게가 없습니다!\n먼저 가게를 추가해주세요.');
            return;
        }

        setIsSpinning(true);
        setSelectedRestaurant(null);

        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * availableRestaurants.length);
            const selected = availableRestaurants[randomIndex];
            setSelectedRestaurant(selected);
            addVisitRecord(selected); // 방문기록 추가
            setIsSpinning(false);
        }, 2000);
    };

    const getFilteredAndSortedRestaurants = () => {
        let filtered = restaurants;

        // 검색 필터링
        if (searchQuery.trim()) {
            filtered = filtered.filter(restaurant =>
                restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                restaurant.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 카테고리 필터링
        if (filterCategory !== 'all') {
            filtered = filtered.filter(restaurant => restaurant.category === filterCategory);
        }

        // 정렬
        return filtered.sort((a, b) => {
            if (sortBy === 'walkTime') {
                const timeA = parseInt(a.walkTime) || 999;
                const timeB = parseInt(b.walkTime) || 999;
                return timeA - timeB;
            }
            return a.name.localeCompare(b.name);
        });
    };

    // 모든 카테고리 목록 가져오기
    const getAllCategories = () => {
        const categories = [...new Set(restaurants.map(restaurant => restaurant.category))];
        return categories.sort();
    };

    // 페이지네이션을 위한 함수들
    const getPaginatedRestaurants = () => {
        const filteredRestaurants = getFilteredAndSortedRestaurants();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredRestaurants.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        const filteredRestaurants = getFilteredAndSortedRestaurants();
        return Math.ceil(filteredRestaurants.length / itemsPerPage);
    };

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < getTotalPages()) {
            setCurrentPage(currentPage + 1);
        }
    };

    // 모달 관련 함수들
    const showModal = (type, title, message, onConfirm = null) => {
        setModal({
            isOpen: true,
            type,
            title,
            message,
            onConfirm
        });
    };

    const hideModal = () => {
        setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    };

    const handleModalConfirm = () => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        hideModal();
    };

    // 방문기록 추가
    const addVisitRecord = (restaurant) => {
        const visitRecord = {
            id: Date.now(),
            restaurant: restaurant,
            visitDate: new Date().toISOString(),
            displayDate: new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            })
        };

        setVisitHistory(prev => [visitRecord, ...prev.slice(0, 49)]); // 최대 50개 기록 유지
    };

    // 방문기록 삭제
    const clearVisitHistory = () => {
        showModal('confirm', '방문기록 삭제', '모든 방문기록을 삭제하시겠습니까?', () => {
            setVisitHistory([]);
            localStorage.removeItem('lunchVisitHistory');
            showModal('success', '삭제 완료', '방문기록이 모두 삭제되었습니다!');
        });
    };

    const showRestaurantDetail = (restaurant) => {
        setSelectedRestaurantDetail(restaurant);
        setCurrentView('detail');
    };

    const resetToSampleData = () => {
        showModal('confirm', '데이터 초기화', '모든 데이터를 삭제하고 샘플 데이터로 초기화하시겠습니까?', () => {
            const sampleData = getSampleData();
            setRestaurants(sampleData);
            localStorage.setItem('lunchRestaurants', JSON.stringify(sampleData));
            showModal('success', '초기화 완료', '샘플 데이터로 초기화되었습니다!');
        });
    };

    const clearAllData = () => {
        showModal('confirm', '데이터 삭제', '정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', () => {
            setRestaurants([]);
            localStorage.removeItem('lunchRestaurants');
            showModal('success', '삭제 완료', '모든 데이터가 삭제되었습니다!');
        });
    };

    // 모달 컴포넌트
    const Modal = () => {
        if (!modal.isOpen) return null;

        return (
            <div className="modal-overlay" onClick={hideModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className={`modal-header ${modal.type}`}>
                        <div className="modal-icon">
                            {modal.type === 'success' && '✅'}
                            {modal.type === 'error' && '❌'}
                            {modal.type === 'confirm' && '❓'}
                        </div>
                        <h3 className="modal-title">{modal.title}</h3>
                    </div>

                    <div className="modal-body">
                        <p className="modal-message">{modal.message}</p>
                    </div>

                    <div className="modal-footer">
                        {modal.type === 'confirm' ? (
                            <>
                                <button className="modal-btn cancel-btn" onClick={hideModal}>
                                    취소
                                </button>
                                <button className="modal-btn confirm-btn" onClick={handleModalConfirm}>
                                    확인
                                </button>
                            </>
                        ) : (
                            <button className="modal-btn ok-btn" onClick={handleModalConfirm}>
                                확인
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (currentView === 'detail' && selectedRestaurantDetail) {
        return (
            <>
                <Head>
                    <title>{selectedRestaurantDetail.name} - 점심메뉴 선택기</title>
                    <meta name="description" content="회사 점심메뉴 선택기" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="nav-header">
                            <button className="back-btn" onClick={() => setCurrentView('main')}>
                                ← 뒤로가기
                            </button>
                            <h1 className="title">{selectedRestaurantDetail.name}</h1>
                        </div>

                        <div className="restaurant-detail">
                            <div className="detail-image">
                                <img src={selectedRestaurantDetail.image} alt={selectedRestaurantDetail.name} />
                            </div>

                            <div className="detail-info">
                                <div className="info-item">
                                    <span className="info-label">카테고리:</span>
                                    <span className="info-value">{selectedRestaurantDetail.category}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">도보 소요시간:</span>
                                    <span className="info-value">{selectedRestaurantDetail.walkTime} 예상</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    // 가게 추가 페이지
    if (currentView === 'add') {
        return (
            <>
                <Head>
                    <title>가게 추가 - 점심메뉴 선택기</title>
                    <meta name="description" content="새로운 가게를 추가하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="nav-header">
                            <button className="back-btn" onClick={() => setCurrentView('main')}>
                                ← 뒤로가기
                            </button>
                            <h1 className="title">🏪 새 가게 추가</h1>
                        </div>

                        <div className="add-section">
                            <div className="add-form">
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newRestaurant}
                                        onChange={(e) => setNewRestaurant(e.target.value)}
                                        placeholder="가게 이름을 입력하세요"
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newWalkTime}
                                        onChange={(e) => setNewWalkTime(e.target.value)}
                                        placeholder="소요시간 (예: 3분)"
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="카테고리 (예: 한식, 중식, 일식)"
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={newImage}
                                        onChange={(e) => setNewImage(e.target.value)}
                                        placeholder="이미지 URL (선택사항)"
                                    />
                                </div>
                                <button className="add-btn" onClick={() => {
                                    if (newRestaurant.trim()) {
                                        addRestaurant();
                                        showModal('success', '추가 완료', `${newRestaurant.trim()} 가게가 추가되었습니다!`, () => {
                                            setCurrentView('main');
                                        });
                                    } else {
                                        showModal('error', '입력 오류', '가게 이름을 입력해주세요.');
                                    }
                                }}>
                                    가게 추가
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    // 가게 관리 페이지
    if (currentView === 'manage') {
        return (
            <>
                <Head>
                    <title>가게 관리 - 점심메뉴 선택기</title>
                    <meta name="description" content="가게를 관리하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="nav-header">
                            <button className="back-btn" onClick={() => setCurrentView('main')}>
                                ← 뒤로가기
                            </button>
                            <h1 className="title">⚙️ 가게 관리</h1>
                        </div>

                        {/* 검색바 */}
                        <div className="search-section">
                            <div className="search-input-group">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="가게 이름이나 카테고리로 검색..."
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button
                                        className="search-clear-btn"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 필터 컨트롤 */}
                        <div className="filter-controls">
                            <div className="control-group">
                                <label>카테고리:</label>
                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                    <option value="all">전체</option>
                                    {getAllCategories().map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="control-group">
                                <label>정렬:</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name">이름순</option>
                                    <option value="walkTime">소요시간순</option>
                                </select>
                            </div>
                        </div>

                        {/* 관리 액션 버튼 */}
                        <div className="management-actions">
                            <button className="add-new-btn" onClick={() => setCurrentView('add')}>
                                ➕ 새 가게 추가
                            </button>
                            <div className="data-management">
                                <button className="reset-btn" onClick={resetToSampleData}>
                                    🔄 샘플 데이터로 초기화
                                </button>
                                <button className="clear-btn" onClick={clearAllData}>
                                    🗑️ 모든 데이터 삭제
                                </button>
                            </div>
                        </div>

                        {/* 가게 목록 */}
                        <div className="restaurants-section">
                            <h3>가게 목록</h3>
                            {restaurants.length === 0 ? (
                                <p className="empty-message">아직 추가된 가게가 없습니다.</p>
                            ) : (
                                <>
                                    {getPaginatedRestaurants().map(restaurant => (
                                        <div key={restaurant.id} className="restaurant-card">
                                            <div className="restaurant-header">
                                                <div className="restaurant-title">
                                                    <h4>{restaurant.name}</h4>
                                                    <span className="category-badge">🍽️ {restaurant.category}</span>
                                                    <span className="walk-time-badge">🚶‍♂️ {restaurant.walkTime}</span>
                                                </div>
                                                <div className="restaurant-actions">
                                                    <button
                                                        className="view-btn"
                                                        onClick={() => showRestaurantDetail(restaurant)}
                                                    >
                                                        👁️
                                                    </button>
                                                    <button
                                                        className="delete-btn"
                                                        onClick={() => deleteRestaurant(restaurant.id)}
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="restaurant-preview">
                                                <img src={restaurant.image} alt={restaurant.name} className="preview-image" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* 페이지네이션 */}
                                    {getTotalPages() > 1 && (
                                        <div className="pagination">
                                            <button
                                                className="pagination-btn"
                                                onClick={goToPrevPage}
                                                disabled={currentPage === 1}
                                            >
                                                ← 이전
                                            </button>

                                            <div className="pagination-numbers">
                                                {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                                        onClick={() => goToPage(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                className="pagination-btn"
                                                onClick={goToNextPage}
                                                disabled={currentPage === getTotalPages()}
                                            >
                                                다음 →
                                            </button>
                                        </div>
                                    )}

                                    {/* 페이지 정보 */}
                                    <div className="pagination-info">
                                        총 {getFilteredAndSortedRestaurants().length}개 가게 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getFilteredAndSortedRestaurants().length)}개 표시
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    // 방문기록 페이지
    if (currentView === 'history') {
        return (
            <>
                <Head>
                    <title>방문기록 - 점심메뉴 선택기</title>
                    <meta name="description" content="점심 가게 방문기록을 확인하세요" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="nav-header">
                            <button className="back-btn" onClick={() => setCurrentView('main')}>
                                ← 뒤로가기
                            </button>
                            <h1 className="title">📊 방문기록</h1>
                        </div>

                        {visitHistory.length > 0 && (
                            <div className="history-actions">
                                <button className="clear-history-btn" onClick={clearVisitHistory}>
                                    🗑️ 기록 모두 삭제
                                </button>
                            </div>
                        )}

                        <div className="history-section">
                            {visitHistory.length === 0 ? (
                                <div className="empty-history">
                                    <div className="empty-icon">📝</div>
                                    <h3>아직 방문기록이 없습니다</h3>
                                    <p>랜덤 선택을 사용하면 방문기록이 저장됩니다!</p>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {visitHistory.map(record => (
                                        <div key={record.id} className="history-item">
                                            <div className="history-image">
                                                <img src={record.restaurant.image} alt={record.restaurant.name} />
                                            </div>
                                            <div className="history-info">
                                                <h4>{record.restaurant.name}</h4>
                                                <div className="history-details">
                                                    <span className="history-category">🍽️ {record.restaurant.category}</span>
                                                    <span className="history-time">🚶‍♂️ {record.restaurant.walkTime}</span>
                                                </div>
                                                <div className="history-date">{record.displayDate}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    if (currentView === 'list') {
        return (
            <>
                <Head>
                    <title>가게 목록 - 점심메뉴 선택기</title>
                    <meta name="description" content="회사 점심메뉴 선택기" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>
                <div className="App">
                    <div className="container">
                        <div className="nav-header">
                            <button className="back-btn" onClick={() => setCurrentView('main')}>
                                ← 뒤로가기
                            </button>
                            <h1 className="title">가게 목록</h1>
                        </div>

                        {/* 검색바 */}
                        <div className="search-section">
                            <div className="search-input-group">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="가게 이름이나 카테고리로 검색..."
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button
                                        className="search-clear-btn"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="filter-controls">
                            <div className="control-group">
                                <label>카테고리:</label>
                                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                    <option value="all">전체</option>
                                    {getAllCategories().map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="control-group">
                                <label>정렬:</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name">이름순</option>
                                    <option value="walkTime">소요시간순</option>
                                </select>
                            </div>
                        </div>

                        <div className="restaurant-grid">
                            {getPaginatedRestaurants().map(restaurant => (
                                <div key={restaurant.id} className="restaurant-item" onClick={() => showRestaurantDetail(restaurant)}>
                                    <div className="restaurant-image">
                                        <img src={restaurant.image} alt={restaurant.name} />
                                    </div>
                                    <div className="restaurant-info">
                                        <h3>{restaurant.name}</h3>
                                        <p className="category">🍽️ {restaurant.category}</p>
                                        <p className="walk-time">🚶‍♂️ {restaurant.walkTime} 예상</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 페이지네이션 */}
                        {getTotalPages() > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                >
                                    ← 이전
                                </button>

                                <div className="pagination-numbers">
                                    {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => goToPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    className="pagination-btn"
                                    onClick={goToNextPage}
                                    disabled={currentPage === getTotalPages()}
                                >
                                    다음 →
                                </button>
                            </div>
                        )}

                        {/* 페이지 정보 */}
                        <div className="pagination-info">
                            총 {getFilteredAndSortedRestaurants().length}개 가게 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getFilteredAndSortedRestaurants().length)}개 표시
                        </div>
                    </div>
                </div>
                <Modal />
            </>
        );
    }

    return (
        <>
            <Head>
                <title>점심메뉴 선택기</title>
                <meta name="description" content="회사 점심메뉴 선택기 - 랜덤으로 가게를 선택해보세요!" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="App">
                <div className="container">
                    <h1 className="title">🍽️ 점심메뉴 선택기</h1>

                    {/* 메인 네비게이션 */}
                    <div className="main-nav">
                        <button className="main-nav-btn list-btn" onClick={() => setCurrentView('list')}>
                            <div className="nav-icon">📋</div>
                            <div className="nav-text">
                                <h3>가게 목록</h3>
                                <p>모든 가게를 한눈에 보기</p>
                            </div>
                        </button>

                        <button className="main-nav-btn manage-btn" onClick={() => setCurrentView('manage')}>
                            <div className="nav-icon">⚙️</div>
                            <div className="nav-text">
                                <h3>가게 관리</h3>
                                <p>가게 추가, 수정 및 삭제</p>
                            </div>
                        </button>

                        <button className="main-nav-btn history-btn" onClick={() => setCurrentView('history')}>
                            <div className="nav-icon">📊</div>
                            <div className="nav-text">
                                <h3>방문기록</h3>
                                <p>지금까지 선택한 가게들</p>
                            </div>
                        </button>
                    </div>

                    {/* 필터 컨트롤 */}
                    <div className="main-filter-controls">
                        <div className="control-group">
                            <label>카테고리 필터:</label>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                <option value="all">전체</option>
                                {getAllCategories().map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 결과 표시 */}
                    <div className="result-section">
                        {isSpinning ? (
                            <div className="spinning">
                                <div className="spinner"></div>
                                <p>가게를 고르는 중...</p>
                            </div>
                        ) : selectedRestaurant ? (
                            <div className="result">
                                <h2>오늘의 점심 가게는!</h2>
                                <div className="selected-item">
                                    <div className="selected-restaurant">
                                        <img src={selectedRestaurant.image} alt={selectedRestaurant.name} className="selected-image" />
                                        <div className="selected-info">
                                            <span className="restaurant">{selectedRestaurant.name}</span>
                                            <span className="walk-time">🚶‍♂️ {selectedRestaurant.walkTime} 예상</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-result">
                                <p>버튼을 눌러서 점심 가게를 선택해보세요!</p>
                            </div>
                        )}
                    </div>

                    {/* 선택 버튼 */}
                    <button
                        className="pick-button"
                        onClick={pickRandomLunch}
                        disabled={isSpinning}
                    >
                        {isSpinning ? '선택 중...' : '🎲 랜덤으로 가게 선택하기'}
                    </button>

                    {/* 간단한 통계 */}
                    <div className="stats-section">
                        <div className="stat-item">
                            <span className="stat-number">{restaurants.length}</span>
                            <span className="stat-label">총 가게 수</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{getAllCategories().length}</span>
                            <span className="stat-label">카테고리 수</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{getFilteredAndSortedRestaurants().length}</span>
                            <span className="stat-label">필터된 가게</span>
                        </div>
                    </div>
                </div>
            </div>
            <Modal />
        </>
    );
}