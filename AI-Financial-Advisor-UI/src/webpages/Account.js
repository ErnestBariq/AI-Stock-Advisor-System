import React, { useEffect, useState, useCallback } from 'react';
import { User, Mail, Phone, Shield, Trash2, Target, Clock } from 'lucide-react';
import { getUserDetails, deletePortfolio } from '../api/client';
import './Account.css';

const Account = () => {
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: 'Not provided',
        investmentGoal: '',
        riskAppetite: '',
        timeHorizon: '',
        lastLogin: 'Unknown',
    });
    const [message, setMessage] = useState('');

    const fetchUserDetails = useCallback(async () => {
        const email = localStorage.getItem('email');
        if (!email) return;

        try {
            const response = await getUserDetails(email);
            if (response.ok) {
                const data = await response.json();
                setUser(data);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    }, []);

    useEffect(() => {
        fetchUserDetails();
    }, [fetchUserDetails]);

    const handleDeletePortfolio = async () => {
        try {
            const response = await deletePortfolio(user.email);
            const data = await response.json();
            setMessage(data.message || 'Portfolio deleted successfully.');
        } catch (error) {
            setMessage('An error occurred while deleting the portfolio.');
            console.error(error);
        }
    };

    return (
        <div className="account-container">
            <div className="account-card">
                <h1 className="account-header">AI Advisor Account Details</h1>
                <div className="details-container">
                    <div className="column">
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                        >
                            <User className="icon" style={{ flexShrink: 0, fontSize: '24px', color: '#4a90e2' }} />
                            <div style={{ fontSize: '16px', color: '#333', fontWeight: 'bold' }}>
                                Personal Details
                            </div>
                        </div>
                        <div >
                            <span>Username: {user.username || 'Unknown User'}</span>
                        </div>
                        <div >
                            <span>Gender: {user.gender || 'Unknown User'}</span>
                        </div>
                        <div >
                            <span>Age: {user.age || 'Unknown User'}</span>
                        </div>
                        <div className="detail-item">
                            <Mail className="icon" />
                            <span>{user.email || 'No Email Provided'}</span>
                        </div>
                        <div className="detail-item">
                            <Phone className="icon" />
                            <span>{user.phone || 'Not Provided'}</span>
                        </div>
                    </div>
                    <div className="column">
                        <div className="detail-item">
                            <Target className="icon" />
                            <span>Investment Goal: {user.investmentGoal || 'Not Set'}</span>
                        </div>
                        <div className="detail-item">
                            <Shield className="icon" />
                            <span>Risk Appetite: {user.riskAppetite || 'Unknown'}</span>
                        </div>
                        <div className="detail-item">
                            <Clock className="icon" />
                            <span>Time Horizon: {user.timeHorizon || 'Not Set'}</span>
                        </div>
                    </div>
                </div>
                <div className="bottom-section">
                    <div className="detail-item">
                        <Shield className="icon" />
                        <span>Last Login: {user.lastLogin || 'Unknown'}</span>
                    </div>
                    <button onClick={handleDeletePortfolio} className="delete-button">
                        <Trash2 className="delete-icon" /> Delete Portfolio
                    </button>
                </div>
                {message && <p className="message">{message}</p>}
            </div>
        </div>
    );

};

export default Account;
