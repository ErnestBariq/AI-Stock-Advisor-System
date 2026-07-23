import React, { useState, useEffect, useCallback } from 'react';
import { Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserDetails, searchSymbolsAlphaVantage } from '../api/client';
import './TopBar.css';

const TopBar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Fetch user details from the API and handle caching
    const fetchUserDetails = useCallback(async () => {
        const email = localStorage.getItem('email');
        if (!email) {
            alert('No user email found. Redirecting to login.');
            navigate('/login');
            return;
        }

        try {
            const response = await getUserDetails(email);

            if (response.ok) {
                const data = await response.json();
                const cachedUserDetails = localStorage.getItem('userDetails');
                // Compare the new data with the cached data
                if (!cachedUserDetails || JSON.stringify(data) !== cachedUserDetails) {
                    localStorage.setItem('userDetails', JSON.stringify(data)); // Update local storage
                }
                setUserDetails(data); // Update state with fetched data
            } else {
                alert('Failed to fetch user details. Redirecting to login.');
                navigate('/login');
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        } finally {
            setLoading(false); // Stop loading once the API call completes
        }
    }, [navigate]);

    useEffect(() => {
        // Check if cached user details are available
        const cachedUserDetails = localStorage.getItem('userDetails');
        if (cachedUserDetails) {
            setUserDetails(JSON.parse(cachedUserDetails));
            setLoading(false); // Display cached data immediately
        }
        // Fetch updated user details from the API
        fetchUserDetails();
    }, [fetchUserDetails]);

    // Function to handle the API call for stock search
    const handleSearch = useCallback(async (query) => {
        if (query.trim() === '') {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await searchSymbolsAlphaVantage(query);
            const data = await response.json();
            console.log('API Response:', data.bestMatches); // For debugging

            if (data.bestMatches) {
                const usRegions = ['united states', 'usa', 'us', 'united states of america'];
                const usEquityMatches = data.bestMatches.filter(
                    (match) =>
                        usRegions.includes(match['4. region']?.toLowerCase()) &&
                        match['3. type']?.toLowerCase() === 'equity'
                );
                setSearchResults(usEquityMatches.slice(0, 10)); // Limit to top 10 results
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error fetching search results:', error);
            setSearchResults([]);
        }
        setIsSearching(false);
    }, []);

    // Debounced search query update to limit API calls
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, handleSearch]);

    // Handle input change
    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Navigate to stock details page when a result is selected
    const handleResultClick = (symbol) => {
        navigate(`/stocks/${symbol}`);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="topbar">
            {/* Application Title */}
            <div className="topbar-title">AI Stock Advisor</div>

            {/* Search Bar */}
            <div className="topbar-search">
                <input
                    type="text"
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    className="topbar-search-input"
                />
                <Search className="search-icon" />

                {/* Search Results Dropdown */}
                {(searchResults.length > 0 || (searchQuery.trim() !== '' && !isSearching)) && (
                    <div className="search-results-dropdown">
                        {isSearching ? (
                            <div className="loading">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((result) => (
                                <div
                                    key={result['1. symbol']}
                                    className="search-result-item"
                                    onClick={() => handleResultClick(result['1. symbol'])}
                                >
                                    {result['1. symbol']} - {result['2. name']}
                                </div>
                            ))
                        ) : (
                            <div className="no-results">No results found.</div>
                        )}
                    </div>
                )}
            </div>

            {/* User Icon and Details */}
            <div className="topbar-user-details">
                <User className="user-icon" />
                <div className="user-info">
                    {loading ? (
                        <div>Loading...</div>
                    ) : userDetails ? (
                        <>
                            <div className="user-name">{userDetails.username}</div>
                            <div className="user-email">{userDetails.email}</div>
                        </>
                    ) : (
                        <div>Error fetching user details</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
