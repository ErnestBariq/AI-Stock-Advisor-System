import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { login } from '../api/client';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');  // State to track error messages
    const [passwordFeedback, setPasswordFeedback] = useState('');  // State for password feedback

    const { login } = useContext(AuthContext); // Access the login function
    const navigate = useNavigate();

    // Function to validate password strength
    const validatePassword = (password) => {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (strongPasswordRegex.test(password)) {
            setPasswordFeedback('Good');
        } else {
            setPasswordFeedback('Bad');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');  // Reset error message

        try {
            const response = await login(email, password);

            if (response.ok) {
                const data = await response.json();
                alert(data.message || 'Login successful');

                localStorage.setItem('email', email); // Save email to localStorage
                login(); // Update authentication state
                navigate('/advisor'); // Redirect to the dashboard

            } else if (response.status === 401) {
                setErrorMessage('Incorrect email or password. Please try again.');
            } else if (response.status === 404) {
                setErrorMessage('User not registered. Please sign up first.');
            } else {
                setErrorMessage('Something went wrong. Please try again later.');
            }
        } catch (error) {
            // Handle network or other fetch errors
            setErrorMessage('Network error. Please check your connection and try again.');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin}>
                <h1>Login</h1>
                {errorMessage && <p className="error-message">{errorMessage}</p>}  {/* Display error messages */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);  // Validate password on every change
                    }}
                    required
                />
                <p>Password Strength: <strong>{passwordFeedback}</strong></p>  {/* Display password strength feedback */}
                {/* Password instructions within the form */}
                <p className="password-instructions">
                    Password must include:
                    <ul>
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character</li>
                    </ul>
                </p>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default LoginPage;
