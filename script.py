
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
from imblearn.over_sampling import SMOTE

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


# Now split features and labels again, these are features being trained on
x = merged_df[['pts_per_game','trb_per_game','ast_per_game']].values

y = merged_df['type'].values
#print(merged_df.columns.tolist())


print(np.bincount(y.astype(int)))

# 1. Split dataset into train and test (80% train, 20% test)
x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)

# 2. Split training data further into train and validation (e.g., 85% train, 15% val)
x_test, x_val, y_test, y_val = train_test_split(x_test, y_test, test_size=0.5)

# 3. Apply SMOTE only on training data to oversample minority class
smote = SMOTE(random_state=42)
x_train_resampled, y_train_resampled = smote.fit_resample(x_train, y_train)

print("Before SMOTE:", np.bincount(y_train))
print("After SMOTE:", np.bincount(y_train_resampled))

#print("Training set is: ", x_train.shape[0], " rows which is ", round(x_train.shape[0]/merged_df.shape[0],4)*100, "%") # Print training shape
#print("Validation set is: ",x_val.shape[0], " rows which is ", round(x_val.shape[0]/merged_df.shape[0],4)*100, "%") # Print validation shape
#print("Testing set is: ",x_test.shape[0], " rows which is ", round(x_test.shape[0]/merged_df.shape[0],4)*100, "%") # Print testing shape

class dataSet(Dataset):
    def __init__(self,x,y):
        self.x = torch.tensor(x, dtype=torch.float32).to(device)
        self.y = torch.tensor(y, dtype=torch.float32).to(device)

    def __len__(self):
        return len(self.x)
    def __getitem__(self, index):
        return self.x[index], self.y[index]

# 4. Create datasets — note you use the resampled training data here
training_data = dataSet(x_train_resampled, y_train_resampled)
validation_data = dataSet(x_val, y_val)
testing_data = dataSet(x_test, y_test)

train_dataloader = DataLoader(training_data, batch_size=16, shuffle=True)
validation_dataloader = DataLoader(validation_data, batch_size=16, shuffle=True)
testing_dataloader = DataLoader(testing_data, batch_size=16, shuffle=True)

'''     
#3.19 % at 25 EPHOCS at pts,rbs,ast
class MyModel(nn.Module):
    def __init__(self, input_size):
        super(MyModel, self).__init__()
        self.input_layer = nn.Linear(input_size, 10)
        self.relu = nn.ReLU()
        self.output_layer = nn.Linear(10, 1)
    def forward(self, x):
        x = self.input_layer(x)
        x = self.relu(x)
        x = self.output_layer(x)
        return x  # no sigmoid
'''
'''
#47.53% at 25 EPHOCS at pts,rbs,ast
class MyModel(nn.Module):
    def __init__(self, input_size):
        super(MyModel, self).__init__()
        self.layer1 = nn.Linear(input_size, 64)
        self.bn1 = nn.BatchNorm1d(64)
        self.dropout1 = nn.Dropout(0.3)

        self.layer2 = nn.Linear(64, 32)
        self.bn2 = nn.BatchNorm1d(32)
        self.dropout2 = nn.Dropout(0.3)

        self.output_layer = nn.Linear(32, 1)

    def forward(self, x):
        x = self.dropout1(torch.relu(self.bn1(self.layer1(x))))
        x = self.dropout2(torch.relu(self.bn2(self.layer2(x))))
        x = torch.sigmoid(self.output_layer(x))
        return x
'''

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
#pos_weight = torch.tensor([31_642 / 964]).to(device)  # ratio of negative to positive
#criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
optimizer = Adam(model.parameters(), lr = 1e-3)

total_loss_train_plot = []
total_loss_validation_plot = []
total_acc_train_plot = []
total_acc_validation_plot = []
EPOCHS = 30
for epoch in range(EPOCHS):
    total_acc_train = 0
    total_loss_train = 0
    total_acc_val = 0
    total_loss_val = 0
    ## Training and Validation
    for data in train_dataloader:

        inputs, labels = data

        prediction = model(inputs).squeeze(1)

        batch_loss = criterion(prediction, labels)

        total_loss_train += batch_loss.item()

        acc = ((torch.sigmoid(prediction) > 0.5) == labels).sum().item()

        total_acc_train += acc

        batch_loss.backward()
        optimizer.step()
        optimizer.zero_grad()

    ## Validation
    with torch.no_grad():
        for data in validation_dataloader:
            inputs, labels = data

            prediction = model(inputs).squeeze(1)

            batch_loss = criterion(prediction, labels)

            total_loss_val += batch_loss.item()

            acc = ((prediction).round() == labels).sum().item()

            total_acc_val += acc

    total_loss_train_plot.append(round(total_loss_train/1000, 4))
    total_loss_validation_plot.append(round(total_loss_val/1000, 4))
    total_acc_train_plot.append(round(total_acc_train/(training_data.__len__())*100, 4))
    total_acc_validation_plot.append(round(total_acc_val/(validation_data.__len__())*100, 4))

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


#print(f"Accuracy Score is: {round((total_acc_test/x_test.shape[0])*100, 2)}%")

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
axs[1].set_xlim([2,30])
axs[1].legend()

plt.tight_layout()

plt.show()