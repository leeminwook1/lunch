import { useState } from 'react';

const RestaurantForm = ({ 
    onSubmit, 
    onCancel, 
    initialData = null,
    loading = false 
}) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        distance: initialData?.distance || '',
        category: initialData?.category || '',
        image: initialData?.image || '',
        description: initialData?.description || '',
        websiteUrl: initialData?.websiteUrl || ''
    });

    const [errors, setErrors] = useState({});

    const categories = ['한식', '중식', '일식', '양식', '분식', '치킨', '카페', '베트남식', '기타'];

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = '가게 이름은 필수입니다';
        } else if (formData.name.length > 50) {
            newErrors.name = '가게 이름은 50자를 초과할 수 없습니다';
        }

        if (!formData.distance.trim()) {
            newErrors.distance = '거리 정보는 필수입니다';
        }

        if (!formData.category) {
            newErrors.category = '카테고리는 필수입니다';
        }

        if (!formData.image.trim()) {
            newErrors.image = '이미지 URL은 필수입니다';
        } else {
            try {
                new URL(formData.image);
            } catch {
                newErrors.image = '올바른 URL 형식이 아닙니다';
            }
        }

        if (formData.websiteUrl && formData.websiteUrl.trim()) {
            try {
                new URL(formData.websiteUrl);
            } catch {
                newErrors.websiteUrl = '올바른 URL 형식이 아닙니다';
            }
        }

        if (formData.description && formData.description.length > 200) {
            newErrors.description = '설명은 200자를 초과할 수 없습니다';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // 에러 메시지 제거
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="restaurant-form-container">
            <div className="form-header">
                <h3>{initialData ? '가게 수정' : '새 가게 추가'}</h3>
            </div>

            <form onSubmit={handleSubmit} className="restaurant-form">
                <div className="form-row">
                    <div className="input-group">
                        <label htmlFor="name">가게 이름 *</label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="가게 이름을 입력하세요"
                            className={errors.name ? 'error' : ''}
                            maxLength={50}
                        />
                        {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="distance">거리 *</label>
                        <input
                            id="distance"
                            type="text"
                            value={formData.distance}
                            onChange={(e) => handleChange('distance', e.target.value)}
                            placeholder="예: 도보 5분"
                            className={errors.distance ? 'error' : ''}
                        />
                        {errors.distance && <span className="error-message">{errors.distance}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="input-group">
                        <label htmlFor="category">카테고리 *</label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className={errors.category ? 'error' : ''}
                        >
                            <option value="">카테고리 선택</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <span className="error-message">{errors.category}</span>}
                    </div>
                </div>

                <div className="input-group">
                    <label htmlFor="image">이미지 URL *</label>
                    <input
                        id="image"
                        type="url"
                        value={formData.image}
                        onChange={(e) => handleChange('image', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className={errors.image ? 'error' : ''}
                    />
                    {errors.image && <span className="error-message">{errors.image}</span>}
                    {formData.image && !errors.image && (
                        <div className="image-preview">
                            <img 
                                src={formData.image} 
                                alt="미리보기"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="input-group">
                    <label htmlFor="websiteUrl">웹사이트 URL</label>
                    <input
                        id="websiteUrl"
                        type="url"
                        value={formData.websiteUrl}
                        onChange={(e) => handleChange('websiteUrl', e.target.value)}
                        placeholder="https://example.com (선택사항)"
                        className={errors.websiteUrl ? 'error' : ''}
                    />
                    {errors.websiteUrl && <span className="error-message">{errors.websiteUrl}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="description">설명</label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="가게에 대한 간단한 설명 (선택사항)"
                        className={errors.description ? 'error' : ''}
                        maxLength={200}
                        rows={3}
                    />
                    <div className="char-count">
                        {formData.description.length}/200
                    </div>
                    {errors.description && <span className="error-message">{errors.description}</span>}
                </div>

                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="btn secondary"
                        disabled={loading}
                    >
                        취소
                    </button>
                    <button 
                        type="submit" 
                        className="btn primary"
                        disabled={loading}
                    >
                        {loading ? '처리 중...' : (initialData ? '수정' : '추가')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RestaurantForm;