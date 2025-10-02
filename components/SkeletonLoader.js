export const RestaurantCardSkeleton = () => (
  <div className="restaurant-card skeleton">
    <div className="skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text short"></div>
      <div className="skeleton-text"></div>
    </div>
  </div>
);

export const RestaurantListSkeleton = ({ count = 6 }) => (
  <div className="restaurants-grid">
    {Array.from({ length: count }, (_, i) => (
      <RestaurantCardSkeleton key={i} />
    ))}
  </div>
);

// CSS는 globals.css에 추가
export const skeletonStyles = `
.skeleton {
  animation: skeleton-loading 1.5s infinite ease-in-out;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
}

.skeleton-content {
  padding: var(--space-4);
}

.skeleton-title {
  height: 24px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

.skeleton-text {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

.skeleton-text.short {
  width: 60%;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
`;