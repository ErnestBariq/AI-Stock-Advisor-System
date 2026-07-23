import React, { useState, useRef, useEffect } from 'react';
import './AddToPortfolioDialog.css';
import { useNavigate } from 'react-router-dom';
import { addToPortfolio } from '../api/client';

function AddToPortfolioDialog({ symbol, currentPrice, companyOverview, financialData, newsData, monthlyData, onClose }) {
    const [amount, setAmount] = useState('');
    const [shares, setShares] = useState('');
    const [investmentType, setInvestmentType] = useState('Lifetime');
    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const dialogRef = useRef(null);
    const isFormValid = amount > 0 && shares > 0;

    useEffect(() => {
        // Handler for clicking outside
        const handleClickOutside = (event) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target)) {
                closeDialog();
            }
        };

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const closeDialog = () => {
        setAmount('');
        setShares('');
        setInvestmentType('Lifetime');
        setShowSuccess(false);
        onClose();
    };

    const handleAmountChange = (e) => {
        const newAmount = e.target.value;
        setAmount(newAmount);

        if (currentPrice > 0 && newAmount) {
            setShares((newAmount / currentPrice).toFixed(4));
        } else {
            setShares('');
        }
    };

    const handleSharesChange = (e) => {
        const newShares = e.target.value;
        setShares(newShares);

        if (currentPrice > 0 && newShares) {
            setAmount((newShares * currentPrice).toFixed(2));
        } else {
            setAmount('');
        }
    };

    const handleViewPortfolio = () => {
        onClose();
        navigate('/portfolio');
    };

    const handleConfirm = async () => {
        if (isFormValid) {
            setIsLoading(true); // Start loading
            const email = localStorage.getItem('email');

            const newStock = {
                symbol,
                amount: parseFloat(amount),
                shares: parseFloat(shares),
                investmentType,
                purchasePrice: currentPrice,
                dateOfPurchase: new Date().toISOString(),
                predictedPrice: null, // Placeholder for predicted price
                riskAssessment: null, // Placeholder for risk assessment
                currentPrice,
                monthlyData, // Include monthly data
                companyOverview,
                financialData,
                newsData,
            };

            try {
                const response = await addToPortfolio(email, newStock);

                if (response.ok) {
                    const data = await response.json();

                    // Update local user details
                    const userDetails = JSON.parse(localStorage.getItem('userDetails')) || {};
                    userDetails.portfolio = data.portfolio;
                    localStorage.setItem('userDetails', JSON.stringify(userDetails));

                    setShowSuccess(true);
                } else {
                    const errorData = await response.json();
                    alert('Failed to add stock to portfolio: ' + errorData.message);
                }
            } catch (error) {
                console.error('Error adding stock to portfolio:', error);
                alert('An error occurred while adding stock to portfolio.');
            } finally {
                setIsLoading(false); // Stop loading
            }
        }
    };

    return (
        <div className="dialog-overlay">
            <div className="dialog-content" ref={dialogRef}>
                {!showSuccess ? (
                    <>
                        <h2>Add {symbol} to Your Portfolio</h2>
                        {/* Show loading bar when loading */}
                        {isLoading && (
                            <div className="loading-bar">
                                <div className="loading-bar-progress"></div>
                            </div>
                        )}
                        {/* Hide form fields while loading */}
                        {!isLoading && (
                            <>
                                <div className="input-group">
                                    <label>Amount you want to invest:</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Number of Stocks:</label>
                                    <input
                                        type="number"
                                        value={shares}
                                        onChange={handleSharesChange}
                                        min="0"
                                        step="0.0001"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Type of Investment:</label>
                                    <select value={investmentType} onChange={(e) => setInvestmentType(e.target.value)}>
                                        <option value="Lifetime">Lifetime</option>
                                        <option value="Short Term">Short Term</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <button
                            onClick={handleConfirm}
                            className="confirm-button"
                            disabled={!isFormValid || isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Confirm'}
                        </button>
                    </>
                ) : (
                    <div className="success-message">
                        <div className="tick-mark">✓</div>
                        <h2>Stock Successfully Added to Your Portfolio!</h2>
                        <button onClick={handleViewPortfolio} className="view-portfolio-button">
                            View Your Portfolio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AddToPortfolioDialog;
