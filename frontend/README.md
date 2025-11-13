# SPL Token Minter Frontend

A beautiful, modular React frontend for minting SPL tokens on Solana.

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/          # React components
│   │   ├── TokenMinter.js   # Main component
│   │   ├── WalletInfo.js    # Wallet connection info
│   │   ├── MintForm.js      # Mint form component
│   │   ├── StatusMessage.js # Status messages
│   │   └── index.js         # Component exports
│   ├── config/              # Configuration
│   │   └── constants.js     # App constants
│   ├── hooks/               # Custom React hooks
│   │   ├── useMintTransaction.js
│   │   └── index.js
│   ├── services/            # API and business logic
│   │   ├── apiService.js    # Backend API calls
│   │   ├── transactionService.js # Transaction handling
│   │   └── index.js
│   ├── utils/               # Utility functions
│   │   ├── validators.js    # Form validation
│   │   └── index.js
│   ├── App.js               # Main app component
│   ├── App.css
│   ├── index.js             # React entry point
│   └── index.css            # Global styles
├── package.json
└── README.md
```

## 🎯 Features

- 🎨 Modern, beautiful UI with gradient designs
- 🔐 Solana Wallet Adapter integration (Phantom, Solflare)
- 🪙 Mint SPL tokens with custom parameters
- 📱 Fully responsive design
- ⚡ Real-time transaction status updates
- 🏗️ Modular architecture for scalability

## 📦 Installation

```bash
cd frontend
npm install
```

## ⚙️ Configuration

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:3000
```

## 🚀 Running

```bash
npm start
```

The app will open at `http://localhost:3000` (or the next available port).

## 🏗️ Architecture

### Components
- **TokenMinter**: Main container component
- **WalletInfo**: Displays connected wallet address
- **MintForm**: Form for minting tokens
- **StatusMessage**: Displays transaction status

### Services
- **apiService**: Handles all backend API calls
- **transactionService**: Manages Solana transaction operations

### Hooks
- **useMintTransaction**: Custom hook for minting tokens with state management

### Utils
- **validators**: Form validation utilities

### Config
- **constants**: Centralized configuration and constants

## 📝 Usage

1. Make sure the backend server is running
2. Open the frontend in your browser
3. Connect your Solana wallet (Phantom, Solflare, etc.)
4. Make sure your wallet is connected to **Devnet**
5. Fill in the form and click "Mint Tokens"
6. Approve the transaction in your wallet
7. Wait for confirmation

## 🔧 Adding New Features

The modular structure makes it easy to add new features:

1. **New Components**: Add to `src/components/`
2. **New Services**: Add to `src/services/`
3. **New Hooks**: Add to `src/hooks/`
4. **New Utils**: Add to `src/utils/`
5. **New Constants**: Add to `src/config/constants.js`

## 📚 Dependencies

- React 18.2.0
- @solana/wallet-adapter-react
- @solana/wallet-adapter-react-ui
- @solana/web3.js
- react-scripts 5.0.1

## 🎨 Styling

- CSS modules for component-specific styles
- Global styles in `index.css`
- Responsive design with mobile-first approach

## 🔒 Security Notes

- The app is configured for Solana **Devnet**
- Make sure your wallet is set to Devnet mode
- Never commit private keys or sensitive data
