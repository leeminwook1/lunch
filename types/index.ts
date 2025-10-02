export interface Restaurant {
    _id: string;
    name: string;
    distance: string;
    category: '한식' | '중식' | '일식' | '양식' | '분식' | '치킨' | '카페' | '베트남식' | '기타';
    image: string;
    description?: string;
    websiteUrl?: string;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
    totalLikes: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface User {
    _id: string;
    name: string;
    email?: string;
    role: 'user' | 'admin';
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
}

export interface Review {
    _id: string;
    userId: string;
    userName: string;
    restaurantId: string;
    rating: number;
    content: string;
    likes: Array<{
        userId: string;
        userName: string;
    }>;
    likeCount: number;
    createdAt: Date;
}

export interface UserPreferences {
    _id: string;
    userId: string;
    preferences: {
        excludeRecentVisits: boolean;
        recentVisitDays: number;
    };
    excludedRestaurants: Array<{
        restaurantId: string;
        restaurantName: string;
        reason: string;
        excludedAt: Date;
    }>;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}