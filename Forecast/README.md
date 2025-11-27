# Forecast API

This folder contains the Python backend for the Financial Advisor app's forecasting features.

## Setup

1.  **Install Python 3.9+**
2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Server

Run the FastAPI server:

```bash
python ml_api.py
```

The server will start on `http://0.0.0.0:8091`.

## Endpoints

### `GET /forecast`
Returns a predicted budget forecast for a user.

-   **Query Params**:
    -   `user_id`: UUID string
    -   `n`: Number of months to forecast (default: 6)

### `POST /analyze`
Analyzes a transaction for risk and categorization.

-   **Body**:
    ```json
    {
      "amount": -500,
      "merchant": "Zara",
      "currency": "MDL"
    }
    ```

## Data
The model uses `users_current_budget_series.csv` for historical data.
