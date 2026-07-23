// components/ui/select.js

import React, { useState } from 'react';
import './Select.css'; // Optional: Use this to add custom styling

// The main Select component that handles the dropdown logic
export const Select = ({ children, defaultValue, onChange }) => {
    const [selectedValue, setSelectedValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (value) => {
        setSelectedValue(value);
        onChange(value);
        setIsOpen(false);
    };

    return (
        <div className="select-container">
            <SelectTrigger onClick={() => setIsOpen(!isOpen)}>
                <SelectValue>{selectedValue}</SelectValue>
            </SelectTrigger>
            {isOpen && <SelectContent onSelect={handleSelect}>{children}</SelectContent>}
        </div>
    );
};

// Component that renders the dropdown list
export const SelectContent = ({ children, onSelect }) => {
    return (
        <div className="select-content">
            {React.Children.map(children, (child) =>
                React.cloneElement(child, { onSelect })
            )}
        </div>
    );
};

// Component for each selectable item in the dropdown
export const SelectItem = ({ value, children, onSelect }) => {
    return (
        <div className="select-item" onClick={() => onSelect(value)}>
            {children}
        </div>
    );
};

// Component to trigger the opening/closing of the dropdown
export const SelectTrigger = ({ children, onClick }) => {
    return (
        <div className="select-trigger" onClick={onClick}>
            {children}
        </div>
    );
};

// Component to display the currently selected value
export const SelectValue = ({ children }) => {
    return <div className="select-value">{children}</div>;
};
