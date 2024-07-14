require('dotenv').config();
const ethers = require('ethers');
const axios = require('axios');

const uniswapV2RouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const apikey = process.env.API_KEY;
const provider = new ethers.providers.WebSocketProvider(process.env.INFURA_WSS_URL);
const genericERC20ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
];
let heartbeatInterval = null;
const HEARTBEAT_INTERVAL = 30000;  // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;   // 10 seconds

function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(async () => {
        let responded = false;

        const timeout = setTimeout(() => {
            if (!responded) {
                console.warn('Heartbeat timeout. Connection might be lost.');
                clearInterval(heartbeatInterval);  
                provider.removeAllListeners('block');
                console.error('timeout, pm2 restarting');
                process.exit(1);
            }
        }, HEARTBEAT_TIMEOUT);

        try {
            await provider.getBlockNumber();
            responded = true;
            clearTimeout(timeout);
        } catch (error) {
            console.error('Heartbeat check failed:', error);
            responded = false;
        }
    }, HEARTBEAT_INTERVAL);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchForWebsiteLink(sourceCode){
    const excludeLinks = [
        "https://eips.ethereum.org",
        "https://solidity.readthedocs.io",
        "https://github.com",
        "https://gitbook.com",
        "https://hardhat.org",
        "https://forum.zeppelin",
        "https://forum.openzeppelin",
        "https://diligence.consensys",
        "https://blog.",
        "https://consensys.",
        "https://docs.",
        "https://cs.",
        "https://web3js.",
        "https://ethereum.github",
        "https://https.eth.wiki",
    ];
    const links = sourceCode.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+(?![\w\-._~:/?#[\]@!$&'()*+,;=%])/g) || [];
    return links.filter(link => !excludeLinks.some(excluded => link.startsWith(excluded)));
}

async function getWebsiteOfContract(contractAddress) {
    try {
        const apiUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apikey}`;
        const response = await axios.get(apiUrl);
        if (response.data && response.data.result) {
            const sourceCode = response.data.result[0].SourceCode;
            const websites = await searchForWebsiteLink(sourceCode);
            return websites.length > 0 ? websites : ['No website link available'];
        }
        throw new Error('Contract Source Code not found.');
    } catch (error) {
        console.error('Error retrieving contract source code:', error);
        throw error;
    }
}

function initializeListeners() {
    provider.on('block', async (blockNumber) => {
        try {
            const block = await provider.getBlockWithTransactions(blockNumber);
            for (let transaction of block.transactions) {
                try {
                    if (transaction && transaction.to && transaction.to.toLowerCase() === uniswapV2RouterAddress.toLowerCase() && transaction.data.toString().startsWith('0xf305d719')) {
                        const tokenAddress = '0x' + transaction.data.slice(34, 74);
                        const amountETHMin = BigInt('0x' + transaction.data.slice(202,266));
                        const tokenContract = new ethers.Contract(tokenAddress, genericERC20ABI, provider);
                        const tokenName = await tokenContract.name();
                        const tokenSymbol = await tokenContract.symbol();
                        const tokensTotalSupplyRaw = await tokenContract.totalSupply();
                        const tokenDecimals = await tokenContract.decimals();
                        const tokenTotalSupply = ethers.utils.formatUnits(ethers.BigNumber.from(tokensTotalSupplyRaw), tokenDecimals);
                        const liquidityAdded = Number(amountETHMin) / 10**18;

                        const websites = await getWebsiteOfContract(tokenAddress);
                        console.log(`Transaction ${transaction.hash} is adding ${liquidityAdded} ETH to $${tokenSymbol}.`);
                        console.log(`Token Address: ${tokenAddress}`);
                        console.log(`Liquidity Added: ${liquidityAdded} ETH`);
                        console.log(`Token Name: ${tokenName}`);
                        console.log(`Token Symbol: ${tokenSymbol}`);
                        console.log(`Token Total Supply: ${tokenTotalSupply}`);
                        console.log(`Token Decimals: ${tokenDecimals}`);
                        console.log(`Website Links: ${websites.join(', ')}`);
                    }
                } catch (transactionError) {
                    console.error(`Error in transaction ${transaction.hash}:`, transactionError);
                }
            }
        } catch (blockError) {
            console.error(`Error in block ${blockNumber}:`, blockError);
        }
    });
    startHeartbeat();
}

initializeListeners();

provider.on('error', async (error) => {
    console.error('WebSocket error:', error);
    await sleep(5000);
    provider.removeAllListeners('block');
    initializeListeners();
});

provider.on('close', async (error) => {
    console.error('WebSocket close:', error);
    await sleep(5000);
    provider.removeAllListeners('block');
    initializeListeners();
});
