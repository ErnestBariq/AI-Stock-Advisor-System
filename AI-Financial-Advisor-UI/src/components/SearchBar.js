// src/components/SearchBar.js
import React from 'react';

function SearchBar({ symbol, onChangeSymbol }) {
  // Handler for when the stock symbol changes
  function handleSymbolChange(event) {
    onChangeSymbol(event.target.value);
  }

  return (
    <div>
      <label>
        <strong>Stock Symbol:</strong>
        <input
          type="text"
          value={symbol}
          onChange={handleSymbolChange}
          placeholder="e.g., IBM"
        />
      </label>
    </div>
  );
}

export default SearchBar;
