
#import os
#import opendatasets as od

# Get the directory where the current script is located
#script_dir = os.path.dirname(os.path.abspath(__file__))

# URL of the Kaggle dataset
#dataset_url = "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats/"

# Download the dataset into the same folder
#od.download(dataset_url, data_dir=script_dir) 

import torch
import torch.nn as nn
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

device = 'cuda' if torch.cuda.is_available() else 'cpu'

merged_df = pd.read_pickle("merged_df.pkl")

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

model = MyModel(input_size=8).to(device)
model.load_state_dict(torch.load("model.pth", map_location=device))
model.eval()

app = Flask(__name__)
CORS(app)

@app.route("/nba_predictions")
def get_nba_data():
    mask = ((merged_df["age"] != 0) & (merged_df["pts_per_game"] > 7) & (merged_df["ast_per_game"] > 1) 
            & (merged_df["trb_per_game"] > 2) & (merged_df["mp_per_game"] > 25) 
            & (merged_df["season"] >= 1976) & (merged_df["g"] >= 50))
    non_zero = merged_df.loc[mask].copy()
    
    sampled = non_zero.sample(n=1000, random_state=42)  # random_state for reproducibility


    data = sampled[["mp_per_game","pts_per_game","ast_per_game","trb_per_game","type","fg_per_game"]].to_dict(orient="records")

    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)

@app.route("/predict_user_input", methods=["POST"])
def predict_input():
    user_data = request.json
    my_inputs = [user_data["features"]]
    model_inputs = torch.tensor(my_inputs, dtype=torch.float32).unsqueeze(0).to(device)
    with torch.no_grad():
        prediction = model(model_inputs)
    return jsonify({"prediction": prediction.item()})



'''
while True:
    user_input = input("Continue (yes or no)? :")
    if(user_input.lower() == "no"):
        print("Peace!")
        break
    elif(user_input.lower() == "yes"):
        pts_per_game = float(input("ppg: "))
        trb_per_game = float(input("rpg: "))
        ast_per_game = float(input("apg: "))
        g = float(input("games: "))
        gs = float(input("games started: "))
        mp_per_game = float(input("minute per game: "))
        fg_per_game = float(input("fgm per game: "))
        fg_percent = float(input("fg percent: "))

        #'pts_per_game','trb_per_game','ast_per_game','g','gs','mp_per_game','fg_per_game', 'fg_percent
        my_inputs = [pts_per_game, trb_per_game, ast_per_game,g,gs,mp_per_game,fg_per_game,fg_percent]

        print("="*20)
        model.eval()
        model_inputs = torch.tensor(my_inputs, dtype=torch.float32).unsqueeze(0).to(device)
        with torch.no_grad():
            prediction = model(model_inputs)

        #print(prediction)
        if(prediction.item() >= 0.5):
            print("All NBA")
        else:
            print("Not All NBA")
        print("Class is:", prediction.item())
    else:
        print("invalid guess")
'''