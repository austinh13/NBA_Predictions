import torch
import torch.nn as nn
from torch.optim import Adam
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np

device = 'cuda' if torch.cuda.is_available() else 'cpu'

all_nba_df = pd.read_csv("nba-aba-baa-stats/End of Season Teams.csv")
stats_df = pd.read_csv("nba-aba-baa-stats/Player Per Game.csv")

all_nba_df = all_nba_df[all_nba_df["type"] == "All-NBA"].copy()
all_nba_df["type"] = 1

merged_df = stats_df.merge(
    all_nba_df[["season","player_id","type"]],
    on = ["season","player_id"],
    how ="left"
)

# All-NBA players are "1" and not are "0" (type)
merged_df["type"] = merged_df["type"].fillna(0).astype(int)
merged_df = merged_df.fillna(0)  # replace NaN with 0

merged_df_corrected = merged_df[
        (merged_df["g"] >= 5)
    ]
merged_df_corrected.to_pickle("merged_df_corrected.pkl")

filtered_df = merged_df[
    (merged_df["age"] != 0) &
    (merged_df["mp_per_game"] > 28.5) &
    (merged_df["ast_per_game"] > 1) &
    (merged_df["g"] >= 50) & 
    (merged_df["pts_per_game"] > 7) &
    (merged_df["trb_per_game"] > 2) &
    (merged_df["season"] >= 1976) 
]

filtered_df.to_pickle("filtered_df.pkl")



# Now split features and labels again, these are features being trained on
x = merged_df_corrected[['pts_per_game','trb_per_game','ast_per_game','g','mp_per_game','fg_per_game']].values
y = merged_df_corrected['type'].values

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
train_loader = DataLoader(dataSet(x_train, y_train), batch_size=16, shuffle=True)
val_loader   = DataLoader(dataSet(x_val, y_val), batch_size=16, shuffle=False)
test_loader  = DataLoader(dataSet(x_test, y_test), batch_size=16, shuffle=False)


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

EPOCHS = 5
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()
        preds = model(xb).squeeze()
        loss = criterion(preds, yb)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    print(f"Epoch {epoch+1}, Train Loss: {total_loss/len(train_loader):.4f}")

model.eval()
correct, total = 0, 0
with torch.no_grad():
    for xb, yb in test_loader:
        xb, yb = xb.to(device), yb.to(device)
        preds = (model(xb).squeeze() >= 0.5).float()
        correct += (preds == yb).sum().item()
        total += yb.size(0)

print(f"Test Accuracy: {100 * correct/total:.2f}%")

torch.save(model.state_dict(), "model.pth")
print("✅ Training complete. Saved merged_df.pkl and model.pth")