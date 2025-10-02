import { useState, useEffect, useCallback, useMemo } from 'react';

export const useRestaurants = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [searchQuery, setSearchQuery] = useState('');

    const apiCall = useCallback(async (endpoint, options = {}) => {
        try {
            const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 호출 오류:', error);
            throw error;
        }
    }, []);

    const loadRestaurants = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterCategory && filterCategory !== 'all') {
                params.append('category', filterCategory);
            }
            if (sortBy) {
                params.append('sortBy', sortBy);
            }
            if (searchQuery && searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }
            
            const queryString = params.toString();
            const url = queryString ? `/api/restaurants?${queryString}` : '/api/restaurants';
            
            const result = await apiCall(url);
            if (result.success) {
                setRestaurants(result.data);
            }
        } catch (error) {
            console.error('가게 목록 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    }, [filterCategory, sortBy, searchQuery, apiCall]);

    const filteredAndSortedRestaurants = useMemo(() => {
        let filtered = restaurants.filter(restaurant => {
            const matchesCategory = filterCategory === 'all' || restaurant.category === filterCategory;
            const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'distance') {
                return parseInt(a.distance) - parseInt(b.distance);
            }
            return 0;
        });

        return filtered;
    }, [restaurants, filterCategory, searchQuery, sortBy]);

    const categories = useMemo(() => {
        const cats = [...new Set(restaurants.map(r => r.category))];
        return cats.sort();
    }, [restaurants]);

    useEffect(() => {
        loadRestaurants();
    }, [loadRestaurants]);

    return {
        restaurants,
        filteredAndSortedRestaurants,
        categories,
        loading,
        filterCategory,
        setFilterCategory,
        sortBy,
        setSortBy,
        searchQuery,
        setSearchQuery,
        loadRestaurants,
        apiCall
    };
};