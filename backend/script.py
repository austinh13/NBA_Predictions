# URL of the Kaggle dataset
#dataset_url = "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats/"


import torch
import torch.nn as nn
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

device = 'cuda' if torch.cuda.is_available() else 'cpu'

filtered_pf = pd.read_pickle("filtered_df.pkl")

class MyModel(nn.Module): 
    def __init__(self, input_size):
        super(MyModel, self).__init__()
        self.fc1 = nn.Linear(input_size, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.dropout1 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(128, 64)
        self.bn2 = nn.BatchNorm1d(64)
        self.dropout2 = nn.Dropout(0.3)
        self.out = nn.Linear(64, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.dropout1(torch.relu(self.bn1(self.fc1(x))))
        x = self.dropout2(torch.relu(self.bn2(self.fc2(x))))
        x = self.sigmoid(self.out(x))
        return x

model = MyModel(input_size=6).to(device)
model.load_state_dict(torch.load("model.pth", map_location=device))
model.eval()

app = Flask(__name__)
CORS(app)


#sampled = non_zero.sample(n=1000, random_state=42)  # random_state for reproducibility

@app.route("/nba_predictions")
def get_nba_data():
    
    sampled = filtered_pf.sample(n=1000, random_state=42)  # random_state for reproducibility
    data = sampled[["mp_per_game","pts_per_game","ast_per_game","trb_per_game","type","fg_per_game"]].to_dict(orient="records")

    return jsonify(data)


@app.route("/predict_user_input", methods=["POST"])
def predict_input():
    try:
        user_data = request.json
        print("🔹 Received data:", user_data)  # Debug log

        # Extract features
        my_inputs = [user_data["features"]]

        # Convert to tensor
        model_inputs = torch.tensor(my_inputs, dtype=torch.float32).to(device)

        # Predict
        with torch.no_grad():
            prediction = model(model_inputs)

        result = prediction.item()
        print("✅ Prediction:", result)

        return jsonify({"prediction": result}), 200
    except Exception as e:
        print("Error:", e) 
        return jsonify({"error": str(e)}), 500
    
if __name__ == "__main__":
    print("🚀 Starting Flask server...")
    app.run(host="127.0.0.1", port=5000, debug=True)

