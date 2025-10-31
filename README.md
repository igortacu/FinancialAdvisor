# Financial Advisor App

A smart financial assistant that helps users track expenses, manage budgets, and get personalized financial insights.

## Features

- 📊 Real-time expense tracking and categorization
- 💰 Budget planning and monitoring
- 📈 Investment portfolio tracking
- 📱 Receipt scanning and automatic categorization
- 🔍 Personalized financial insights
- 📈 Analytics and spending patterns
- 🔒 Secure authentication with Supabase

## Tech Stack

- **Frontend**:
  - React Native / Expo
  - TypeScript
  - Expo Router
  - React Native Reanimated
  - React Native Charts

- **Backend**:
  - Supabase (Authentication, Database)
  - Python (Receipt OCR)
  - ML Models (Transaction Classification)

- **APIs**:
  - Finnhub (Investment Data)
  - Custom OCR API

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Expo Go app (iOS/Android)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/igortacu/FinancialAdvisor.git
cd FinancialAdvisor
```

2. Install dependencies:
```bash
cd finance-assistant/fintech-ui
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your environment variables:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_FINNHUB_KEY=your-finnhub-api-key
EXPO_PUBLIC_SUPABASE_FN_PROXY_URL=your-supabase-functions-url
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run web` | Start web development server |
| `npm run ios` | Start iOS simulator |
| `npm run android` | Start Android emulator |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run build` | Build for production |

## ML Advisor API (local)

For AI-assisted categorization, risk flags, and advice, the app calls a local FastAPI service in the `Forecast/` folder.

1) Install and run the service (in a separate terminal):

```powershell
cd ..\..\Forecast
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Use 8091 to avoid local collisions on 8090
$env:ML_API_PORT="8091"; $env:ML_API_CORS="*"; python ml_api.py
```

2) Point the app to it by setting an environment variable before starting Expo:

```powershell
$env:EXPO_PUBLIC_ML_API_URL="http://localhost:8091"; npx expo start
```

When active, new transactions (scan/manual) will:

- Auto-categorize via ML service
- Flag risky transactions and show an advice alert
- Store ML output under the `meta.ml` field in the ledger row

## App Screenshots

[Screenshots will be added here]

## Development

### Project Structure
```
finance-assistant/
├── fintech-ui/         # Main React Native app
│   ├── app/           # Expo Router pages
│   ├── components/    # Reusable components
│   ├── constants/     # Theme and config
│   ├── lib/          # Utilities and APIs
│   └── store/        # State management
├── ocr-api/          # Python OCR service
└── supabase/         # Supabase functions
```

### Architecture

The app follows a modern, scalable architecture:
- Expo Router for file-based routing
- Supabase for authentication and data storage
- Custom OCR service for receipt processing
- ML models for transaction classification

## Security Notes

- Never commit sensitive data or API keys
- Use environment variables for all secrets
- Follow security best practices in the [SECURITY.md](./SECURITY.md)
- Enable 2FA for all connected services

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
