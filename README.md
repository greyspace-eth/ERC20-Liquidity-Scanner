# Liquidity Scanner

## Description

Liquidity Scanner is a bot that scans for liquidity added to ERC20 tokens on Ethereum. The bot listens to the Ethereum blockchain for new transactions and checks for liquidity additions on Uniswap.

## Features

- Tracks liquidity additions for ERC20 tokens.
- Fetches and displays token metadata, including name, symbol, total supply, and website links.

## Prerequisites

- Node.js installed
- npm installed

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/liquidity-scanner.git
    cd liquidity-scanner
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add your Ethereum API key and WebSocket URL:
    ```env
    API_KEY=your_etherscan_api_key
    INFURA_WSS_URL=wss://mainnet.infura.io/ws/v3/your_infura_project_id
    ```

4. Start the bot:
    ```bash
    npm start
    ```

## Usage

- The bot listens to new blocks on the Ethereum blockchain and processes each transaction to check for liquidity additions.
- If liquidity is detected, it fetches and displays the token details, including the added liquidity amount, token name, symbol, total supply, and any associated website links.

## License

This project is licensed under the MIT License.
