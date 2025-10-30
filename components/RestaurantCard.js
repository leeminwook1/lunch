import { memo } from 'react';

const RestaurantCard = memo(({ 
    restaurant, 
    onEdit, 
    onDelete, 
    onViewDetail, 
    isAdmin,
    currentUser 
}) => {
    const handleEdit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(restaurant);
    };

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(restaurant._id, restaurant.name);
    };

    const handleViewDetail = () => {
        onViewDetail(restaurant);
    };

    return (
        <div className="restaurant-card" onClick={handleViewDetail}>
            {isAdmin && (
                <div className="restaurant-actions">
                    <button 
                        className="btn-edit"
                        onClick={handleEdit}
                        onMouseDown={handleEdit}
                        title="수정"
                        type="button"
                    >
                        ✏️
                    </button>
                    <button 
                        className="btn-delete"
                        onClick={handleDelete}
                        onMouseDown={handleDelete}
                        title="삭제"
                        type="button"
                    >
                        🗑️
                    </button>
                </div>
            )}
            
            <div className="restaurant-image">
                <img 
                    src={restaurant.image} 
                    alt={restaurant.name}
                    loading="lazy"
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/320x200/f1f5f9/64748b?text=' + encodeURIComponent(restaurant.name);
                    }}
                    style={{ backgroundColor: 'white' }}
                />
                <div className="restaurant-category">{restaurant.category}</div>
            </div>
            
            <div className="restaurant-info">
                <h3 className="restaurant-name">{restaurant.name}</h3>
                <div className="restaurant-distance">🚶‍♂️ {restaurant.distance}</div>
                
                {restaurant.description && (
                    <p className="restaurant-description">{restaurant.description}</p>
                )}
                
                <div className="restaurant-stats">
                    <span>⭐ {restaurant.averageRating?.toFixed(1) || '0.0'}</span>
                    <span>💬 {restaurant.reviewCount || 0}</span>
                    <span>👍 {restaurant.totalLikes || 0}</span>
                </div>
            </div>
        </div>
    );
});

RestaurantCard.displayName = 'RestaurantCard';

export default RestaurantCard;