import React from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    // This would typically come from your API
    const portfolioValue = 150000;
    const dailyChange = 1500;
    const percentageChange = 1.01;

    const data = [
        { name: 'Jan', value: 140000 },
        { name: 'Feb', value: 139000 },
        { name: 'Mar', value: 142000 },
        { name: 'Apr', value: 141000 },
        { name: 'May', value: 145000 },
        { name: 'Jun', value: 150000 },
    ];

    return (
        <div className="dashboard">
            <h1 className="text-2xl font-bold mb-4">Financial Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Portfolio Value</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <DollarSign className="mr-2" />
                            <span className="text-2xl font-bold">${portfolioValue.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Daily Change</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            {dailyChange >= 0 ? <TrendingUp className="mr-2 text-green-500" /> : <TrendingDown className="mr-2 text-red-500" />}
                            <span className={`text-2xl font-bold ${dailyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${Math.abs(dailyChange).toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Percentage Change</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            {percentageChange >= 0 ? <TrendingUp className="mr-2 text-green-500" /> : <TrendingDown className="mr-2 text-red-500" />}
                            <span className={`text-2xl font-bold ${percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {percentageChange.toFixed(2)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <h2 className="text-lg font-semibold">Portfolio Performance</h2>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;