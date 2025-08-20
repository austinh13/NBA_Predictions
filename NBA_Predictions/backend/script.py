
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
from torch.optim import Adam
from torch.utils.data import Dataset, DataLoader
from torchsummary import summary
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import shap
from flask import Flask, jsonify, request
from flask_cors import CORS


device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(device)

# get data from all nba players then data from player stats per game
all_nba_df = pd.read_csv("nba-aba-baa-stats/End of Season Teams.csv")
stats_df = pd.read_csv("nba-aba-baa-stats/Player Per Game.csv")

all_nba_df = all_nba_df[all_nba_df["type"] == "All-NBA"].copy()
all_nba_df["type"] = 1


# merges All-NBA players stats to all players
merged_df = stats_df.merge(
    all_nba_df[["season","player_id","type"]],
    on = ["season","player_id"],
    how ="left"
)

# All-NBA players are "1" and not are "0" (type)
merged_df["type"] = merged_df["type"].fillna(0).astype(int)
merged_df = merged_df.fillna(0)  # replace NaN with 0

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


#g,gs,mp_per_game,fg_per_game,fga_per_game,fg_percent,x3p_per_game,x3pa_per_game,x3p_percent,x2p_per_game,x2pa_per_game,x2p_percent,e_fg_percent,ft_per_game,fta_per_game,ft_percent,orb_per_game,drb_per_game,trb_per_game,ast_per_game,stl_per_game,blk_per_game,tov_per_game,pf_per_game,pts_per_game

# Now split features and labels again, these are features being trained on
x = merged_df[['pts_per_game','trb_per_game','ast_per_game','g','gs','mp_per_game','fg_per_game','fg_percent']].values

y = merged_df['type'].values
#print(merged_df.columns.tolist())


print(np.bincount(y.astype(int)))


x_train, x_temp, y_train, y_temp = train_test_split(x, y, test_size=0.3, random_state=42)
x_val, x_test, y_val, y_test = train_test_split(x_temp, y_temp, test_size=0.5, random_state=42)

class dataSet(Dataset):
    def __init__(self,x,y):
        self.x = torch.tensor(x, dtype=torch.float32).to(device)
        self.y = torch.tensor(y, dtype=torch.float32).to(device)

    def __len__(self):
        return len(self.x)
    def __getitem__(self, index):
        return self.x[index], self.y[index]

# 4. Create datasets — note you use the resampled training data here
training_data = dataSet(x_train, y_train)
validation_data = dataSet(x_val, y_val)
testing_data = dataSet(x_test, y_test)

train_dataloader = DataLoader(training_data, batch_size=16, shuffle=True)
validation_dataloader = DataLoader(validation_data, batch_size=16, shuffle=True)
testing_dataloader = DataLoader(testing_data, batch_size=16, shuffle=True)

#50.57% at 25 EPHOCS at pts,rbs,ast
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

# Create model
model = MyModel(input_size=x.shape[1]).to(device)

criterion = nn.BCELoss()
optimizer = Adam(model.parameters(), lr = 1e-3)

total_loss_train_plot = []
total_loss_validation_plot = []
total_acc_train_plot = []
total_acc_validation_plot = []
EPOCHS = 5
with torch.no_grad():
  total_loss_test = 0
  total_acc_test = 0
  for data in testing_dataloader:
    inputs, labels = data

    prediction = model(inputs).squeeze(1)

    batch_loss_test = criterion((prediction), labels)
    total_loss_test += batch_loss_test.item()
    acc = ((prediction).round() == labels).sum().item()
    total_acc_test += acc


print(f"Accuracy Score is: {round((total_acc_test/x_test.shape[0])*100, 2)}%")

'''
fig, axs = plt.subplots(nrows=1, ncols=2, figsize=(15, 5))


axs[0].plot(total_loss_train_plot, label='Training Loss')
axs[0].plot(total_loss_validation_plot, label='Validation Loss')
axs[0].set_title('Training and Validation Loss over Epochs')
axs[0].set_xlabel('Epochs')
axs[0].set_ylabel('Loss')
axs[0].set_ylim([0, 2])
axs[0].legend()

axs[1].plot(total_acc_train_plot, label='Training Accuracy')
axs[1].plot(total_acc_validation_plot, label='Validation Accuracy')
axs[1].set_title('Training and Validation Accuracy over Epochs')
axs[1].set_xlabel('Epochs')
axs[1].set_ylabel('Accuracy')
axs[1].set_ylim([0, 100])
axs[1].set_xlim([2,EPOCHS])
axs[1].legend()

plt.tight_layout()

plt.show()
'''

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