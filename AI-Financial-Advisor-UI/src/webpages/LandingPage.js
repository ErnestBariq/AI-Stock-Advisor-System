import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing">
            <div className="landing-hero">
                <h1>Welcome to Stock Market Advisor</h1>
                <p>Your ultimate solution for smart and profitable stock market decisions.</p>
                <div className="landing-buttons">
                    <Link to="/signup" className="btn-primary">Sign Up</Link>
                    <Link to="/login" className="btn-secondary">Login</Link>
                </div>
            </div>

            <div className="features-section">
                <h2>Why Choose Us?</h2>
                <div className="features-grid">
                    <div className="feature-item">
                        <h3>Accurate Predictions</h3>
                        <p>Our AI-powered algorithms analyze market trends and help you make data-driven decisions.</p>
                    </div>
                    <div className="feature-item">
                        <h3>Real-Time Alerts</h3>
                        <p>Stay updated with real-time alerts on stock movements, ensuring you never miss an opportunity.</p>
                    </div>
                    <div className="feature-item">
                        <h3>Portfolio Management</h3>
                        <p>Easily track and manage your investments in one place, tailored to your financial goals.</p>
                    </div>
                </div>
            </div>

            <div className="testimonial-section">
                <h2>What Our Users Are Saying</h2>
                <div className="testimonials">
                    <div className="testimonial-item">
                        <p>"Stock Market Advisor has completely transformed the way I invest. The predictions are spot on!"</p>
                        <h4>- John Doe</h4>
                    </div>
                    <div className="testimonial-item">
                        <p>"The real-time alerts have saved me from losses multiple times. A must-have tool for any investor."</p>
                        <h4>- Jane Smith</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
